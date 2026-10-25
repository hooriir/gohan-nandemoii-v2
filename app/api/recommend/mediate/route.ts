import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import type { Dish, Tag } from "@prisma/client";
import { getJstDateOnly } from "@/utils/date";

const ai = new GoogleGenAI({});

type DishWithTags = Dish & { tags: Tag[] };

// 指定したミリ秒だけ待機するユーティリティ関数
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ヘルパー: セッション/ユーザーを軽量・安全に取得（ConnectTimeoutError対策）
async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (!sessionError && session?.user) {
    return session.user;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;
  return user;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { error: "認証が必要です。ログインしてください。" },
        { status: 401 }
      );
    }

    const member = await prisma.householdMember.findFirst({
      where: { userId: user.id },
    });

    if (!member) {
      return NextResponse.json(
        { error: "世帯に所属していません。世帯を作成または参加してください。" },
        { status: 400 }
      );
    }

    const householdId = member.householdId;

    // 日本時間の本日日付文字列（YYYY-MM-DD）を取得
    const today = getJstDateOnly();

    // 1. その世帯の「今日」の MealRequest（希望）を全員分取得
    const requests = await prisma.mealRequest.findMany({
      where: {
        householdId: householdId,
        requestDate: today,
      },
      include: {
        user: true,
        dish: true,
      },
    });

    if (requests.length === 0) {
      return NextResponse.json(
        { error: "今日の家族の希望がまだ登録されていません。" },
        { status: 400 }
      );
    }

    // 2. 世帯に紐づくメニュー一覧を取得
    const householdDishes = await prisma.dish.findMany({
      where: { householdId: householdId },
      include: { tags: true },
    });

    if (householdDishes.length === 0) {
      return NextResponse.json(
        { error: "登録されているメニューがありません。先にメニューを追加してください。" },
        { status: 400 }
      );
    }

    // ==========================================
    // 2.5. 直近1週間の履歴除外 & NG除外のフィルタリング
    // ==========================================

    // A. 過去7日以内の提案履歴（DishShowLog）を取得
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentLogs = await prisma.dishShowLog.findMany({
      where: {
        householdId: householdId,
        createdAt: {
          gte: oneWeekAgo,
        },
      },
      select: { dishId: true },
    });
    const recentDishIds = new Set(recentLogs.map((log) => log.dishId));

    // B. メンバーのNG希望を抽出
    const ngDishIds = new Set<string>();
    const ngKeywords = new Set<string>();

    requests.forEach((r) => {
      if (r.type === "NG") {
        if (r.dishId) ngDishIds.add(r.dishId);
        if (r.keyword) ngKeywords.add(r.keyword.trim());
      }
    });

    // C. 候補から「1週間以内に行ったメニュー」と「NGメニュー」を除外
    const availableDishes = householdDishes.filter((dish) => {
      // 1週間以内なら除外
      if (recentDishIds.has(dish.id)) return false;

      // NG（ID一致、またはメニュー名一致）なら除外
      if (ngDishIds.has(dish.id)) return false;
      if (ngKeywords.has(dish.name)) return false;

      return true;
    });

    // D. 有効な候補が0件の場合のハンドリング（UT-24対応）
    if (availableDishes.length === 0) {
      return NextResponse.json(
        { error: "条件に一致する有効なメニュー候補がありません（全メニューがNGまたは1週間以内に提案済みです）。" },
        { status: 400 }
      );
    }

    // ==========================================
    // 3. Geminiへのプロンプト作成（絞り込み済みの availableDishes を使用）
    // ==========================================
    const requestsSummary = requests
      .map((r) => {
        const userName = r.user.name || "家族の誰か";
        const typeText =
          r.type === "WANT"
            ? `食べたい: ${r.dish?.name || r.keyword || "特になし"}`
            : r.type === "NG"
            ? `避けたい（NG）: ${r.dish?.name || r.keyword || "特になし"}`
            : "なんでもいい";
        return `- ${userName}: ${typeText}`;
      })
      .join("\n");

    const dishesSummary = availableDishes
      .map((d) => `- ${d.name} (タグ: ${d.tags.map((t) => t.name).join(", ")})`)
      .join("\n");

    const prompt = `あなたは親しみやすくておしゃべりな専属シェフアシスタントです。
以下の「家族の今日の希望」と「利用可能なメニュー一覧（直近の履歴やNGを除外済み）」をすべて考慮し、今日作るべき料理をメニュー一覧の中から1つ選んでください。

【家族の希望一覧】
${requestsSummary}

【利用可能なメニュー一覧】
${dishesSummary}

家族全員の意見（WANTなど）を上手に汲み取り、なぜその料理に決めたのかの理由を、まるで友達や家族に話しかけるように温かみのあるトーンで120〜150文字程度で教えてください。`;

    let selectedDish: DishWithTags = availableDishes[0];
    let reasonText = `家族みんなの希望をバランスよく考えて、本日は「${selectedDish.name}」に決定しました！楽しく食べてくださいね！`;
    let isAiSuccess = false;

    const modelName = process.env.GEMINI_MODEL_NAME || "gemini-3.6-flash";
    const maxRetries = 3;
    let delay = 300;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                matchedDishName: {
                  type: Type.STRING,
                  description: "メニュー一覧の中から選ばれた料理の名前",
                },
                reason: {
                  type: Type.STRING,
                  description: "選んだ理由や家族の意見を調停したコメント",
                },
              },
              required: ["matchedDishName", "reason"],
            },
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          if (parsed.matchedDishName) {
            const found = availableDishes.find(
              (d) => d.name === parsed.matchedDishName
            );
            if (found) {
              selectedDish = found;
            }
          }
          if (parsed.reason) {
            reasonText = parsed.reason;
            isAiSuccess = true;
          }
          break;
        }
      } catch (aiError) {
        console.warn(
          `Gemini API試行 [${attempt}/${maxRetries}] に失敗しました:`,
          aiError
        );

        if (attempt === maxRetries) {
          console.error("規定のリトライ回数を超えました。デフォルトメッセージを保存します。");
          break;
        }

        // 次のリトライまで待機（指数バックオフ: 500ms -> 1000ms -> 2000ms）
        await sleep(delay);
        delay *= 2;
      }
    }

    // 4. 調停結果（AIのコメント、またはフォールバック文）を DishShowLog に保存
    await prisma.dishShowLog.create({
      data: {
        householdId: householdId,
        dishId: selectedDish.id,
        keyword: reasonText,
      },
    });

    return NextResponse.json({
      dish: {
        id: selectedDish.id,
        name: selectedDish.name,
        imageUrl: selectedDish.imageUrl || null,
      },
      reason: reasonText,
      isAiGeneration: isAiSuccess,
    });
  } catch (error) {
    console.error("Mediate API Error:", error);
    return NextResponse.json(
      { error: "AI調停によるメニューの決定に失敗しました。" },
      { status: 500 }
    );
  }
}
