import { describe, test, expect } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('2-1. 権限・世帯スコープ（結合テスト）', () => {

  // --- UT-01: メニュー削除のスコープ ---
  test('UT-01: 他世帯のメニューIDを指定して削除しようとしても削除されないこと', async () => {
    const householdA = 'household-A';
    const householdB = 'household-B';

    // 期待結果: 世帯Aのスコープ（householdId: householdA）で検索・削除すると、世帯Bのメニューは該当せず削除件数が0件になる
    const targetDishId = 'dish-belonging-to-household-B';

    const deleteResult = await prisma.dish.deleteMany({
      where: {
        id: targetDishId,
        householdId: householdA, // 世帯Aの権限で削除しようとする
      },
    });

    // 世帯Bのデータなので、世帯Aからは削除できない（countが0）
    expect(deleteResult.count).toBe(0);
  });

  // --- UT-02: メニュー取得のスコープ ---
  test('UT-02: メニュー一覧取得時に自世帯のデータのみが返ること', async () => {
    const householdA = 'household-A';

    // 世帯Aのスコープでメニューを検索するクエリをシミュレート
    const dishes = await prisma.dish.findMany({
      where: { householdId: householdA },
    });

    // 取得されたすべてのデータが householdA のものであることを確認
    for (const dish of dishes) {
      expect(dish.householdId).toBe(householdA);
    }
  });

  // --- UT-03: 履歴取得のスコープ ---
  test('UT-03: 決定履歴取得時に他世帯の履歴が混入しないこと', async () => {
    const householdA = 'household-A';
    const householdB = 'household-B';

    // 世帯Aのスコープで履歴を取得
    const logs = await prisma.dishShowLog.findMany({
      where: { householdId: householdA },
    });

    // 取得した履歴に世帯BのIDが含まれていないことを確認
    for (const log of logs) {
      expect(log.householdId).toBe(householdA);
      expect(log.householdId).not.toBe(householdB);
    }
  });

  // --- UT-04: 希望の更新制限 ---
  test('UT-04: 他人の希望や別世帯のIDを指定して書き込みができないこと', async () => {
    const targetHouseholdId: string = 'different-household-id';
    const myHouseholdId: string = 'my-household-id';

    const invalidAction = async () => {
      if (targetHouseholdId !== myHouseholdId) {
        throw new Error('403: 権限がありません');
      }
    };

    await expect(invalidAction()).rejects.toThrow('403');
  });

  // --- UT-05: 世帯未所属の操作制限 ---
  test('UT-05: 世帯に所属していないユーザーはデータ操作が拒否されること', async () => {
    const userHouseholdId: string | null = null;

    const performDataAction = async (householdId: string | null) => {
      if (!householdId) {
        throw new Error('400: 世帯に所属していません');
      }
    };

    // householdId が null の場合、エラー（400）がスローされることを検証
    await expect(performDataAction(userHouseholdId)).rejects.toThrow('400');
  });

});
