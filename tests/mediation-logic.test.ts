import { describe, test, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// 調停ロジックの判定関数（仮実装・テスト用イメージ）
// ※ 実際の実装コード（例: @/lib/mediation など）がある場合はそちらからインポートします
// ---------------------------------------------------------------------------

interface Dish {
  id: string;
  name: string;
}

interface HistoryLog {
  dishId: string;
  createdAt: Date;
}

interface Preference {
  dishId: string;
  type: 'NG' | 'WANT' | 'ANY';
}

// 候補絞り込みヘルパー関数
function filterCandidates(
  dishes: Dish[],
  logs: HistoryLog[],
  preferences: Preference[],
  now: Date = new Date()
): Dish[] {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  return dishes.filter((dish) => {
    // 1. NGチェック
    const isNg = preferences.some(
      (p) => p.dishId === dish.id && p.type === 'NG'
    );
    if (isNg) return false;

    // 2. 直近1週間（7日以内）の提案履歴チェック
    const isRecentlyProposed = logs.some((log) => {
      if (log.dishId !== dish.id) return false;
      const diff = now.getTime() - new Date(log.createdAt).getTime();
      return diff >= 0 && diff <= SEVEN_DAYS_MS;
    });
    if (isRecentlyProposed) return false;

    return true;
  });
}

// AI応答バリデーションヘルパー関数
function validateAiResponse(aiDishName: string, candidates: Dish[]): Dish | null {
  const matched = candidates.find((c) => c.name === aiDishName);
  return matched || null;
}

// ---------------------------------------------------------------------------
// テストスイート
// ---------------------------------------------------------------------------

describe('2-3. 調停の絞り込みロジック（単体・結合テスト）', () => {
  const baseDate = new Date('2026-10-20T12:00:00Z');

  const sampleDishes: Dish[] = [
    { id: 'dish-1', name: 'カレー' },
    { id: 'dish-2', name: 'ハンバーグ' },
    { id: 'dish-3', name: 'パスタ' },
  ];

  // --- UT-20: 1週間除外（3日前） ---
  test('UT-20: 3日前に提案されたメニューがある場合、候補から除外されること', () => {
    const threeDaysAgo = new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000);
    const logs: HistoryLog[] = [{ dishId: 'dish-1', createdAt: threeDaysAgo }];

    const result = filterCandidates(sampleDishes, logs, [], baseDate);

    expect(result.some((d) => d.id === 'dish-1')).toBe(false);
    expect(result.length).toBe(2);
  });

  // --- UT-21: 1週間除外（8日前） ---
  test('UT-21: 8日前に提案されたメニューがある場合、除外されず候補に含まれること', () => {
    const eightDaysAgo = new Date(baseDate.getTime() - 8 * 24 * 60 * 60 * 1000);
    const logs: HistoryLog[] = [{ dishId: 'dish-1', createdAt: eightDaysAgo }];

    const result = filterCandidates(sampleDishes, logs, [], baseDate);

    expect(result.some((d) => d.id === 'dish-1')).toBe(true);
    expect(result.length).toBe(3);
  });

  // --- UT-22: NG除外 ---
  test('UT-22: メンバーの1人が特定メニューをNGに設定している場合、候補から除外されること', () => {
    const preferences: Preference[] = [{ dishId: 'dish-2', type: 'NG' }];

    const result = filterCandidates(sampleDishes, [], preferences, baseDate);

    expect(result.some((d) => d.id === 'dish-2')).toBe(false);
    expect(result.length).toBe(2);
  });

  // --- UT-23: WANT優先 ---
  test('UT-23: WANT（食べたい）設定されたメニューが存在することを確認できること', () => {
    const preferences: Preference[] = [{ dishId: 'dish-3', type: 'WANT' }];
    const wantDishIds = preferences.filter((p) => p.type === 'WANT').map((p) => p.dishId);

    const candidates = filterCandidates(sampleDishes, [], preferences, baseDate);
    const hasWantInCandidates = candidates.some((c) => wantDishIds.includes(c.id));

    expect(hasWantInCandidates).toBe(true);
  });

  // --- UT-24: 候補0件 ---
  test('UT-24: 全メニューがNGまたは1週間以内の場合、候補が0件になること', () => {
    const twoDaysAgo = new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000);
    const logs: HistoryLog[] = [
      { dishId: 'dish-1', createdAt: twoDaysAgo },
      { dishId: 'dish-2', createdAt: twoDaysAgo },
    ];
    const preferences: Preference[] = [{ dishId: 'dish-3', type: 'NG' }];

    const result = filterCandidates(sampleDishes, logs, preferences, baseDate);

    expect(result.length).toBe(0);
  });

  // --- UT-25: 全員ANY ---
  test('UT-25: 全メンバーの希望がANYの場合、除外条件以外の全候補が取得できること', () => {
    const preferences: Preference[] = [
      { dishId: 'dish-1', type: 'ANY' },
      { dishId: 'dish-2', type: 'ANY' },
    ];

    const result = filterCandidates(sampleDishes, [], preferences, baseDate);

    expect(result.length).toBe(3);
  });

  // --- UT-26: AI失敗フォールバック（モック） ---
  test('UT-26: Gemini APIがエラーを返した場合（モック）、エラーをキャッチしてフォールバック処理されること', async () => {
    // Gemini API呼び出しをモック化してエラーを意図的に発生させる
    const mockCallGemini = vi.fn().mockRejectedValue(new Error('500 Internal Server Error'));

    const runMediationWithFallback = async () => {
      try {
        await mockCallGemini();
        return 'AI決定メニュー';
      } catch (error) {
        // フォールバック処理：候補の中から先頭を選択
        return sampleDishes[0].name;
      }
    };

    const selectedDish = await runMediationWithFallback();

    expect(mockCallGemini).toHaveBeenCalled();
    expect(selectedDish).toBe('カレー'); // フォールバックで正常に決定されること
  });

  // --- UT-27: AI異常応答チェック（モック） ---
  test('UT-27: Gemini APIがDB外の不整合なメニュー名を返した場合、検証で排除されること', () => {
    const aiResponse = 'ラーメン'; // DB候補（カレー, ハンバーグ, パスタ）に存在しない応答

    const validatedDish = validateAiResponse(aiResponse, sampleDishes);

    expect(validatedDish).toBeNull();
  });
});
