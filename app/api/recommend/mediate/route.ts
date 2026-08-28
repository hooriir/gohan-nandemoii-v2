import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import type { Dish, Tag } from "@prisma/client";

const ai = new GoogleGenAI({});

type DishWithTags = Dish & { tags: Tag[]; };

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "認証が必要です。ログインしてください。" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const member = await prisma.householdMember.findUnique({
      where: { userId: user.id },
    });

    if (!member) {
      return new Response(
        JSON.stringify({ error: "世帯に所属していません。世帯を作成または参加してください。" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const householdId = member.householdId;

    const body = await request.json().catch(() => ({}));
    const targetDateStr = body.date ? new Date(body.date) : new Date();
    targetDateStr.setHours(0, 0, 0, 0);

    // 1. その世帯の「今日」の MealRequest（希望）を全員分取得
    const requests = await prisma.mealRequest.findMany({
      where: {
        householdId: householdId,
        requestDate: targetDateStr,
      },
      include: {
        user: true,
        dish: true,
      },
    });

    if (requests.length === 0) {
      return new Response(
        JSON.stringify({ error: "今日の家族の希望がまだ登録されていません。" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. 世帯に紐づくメニュー一覧を取得（直近の除外ロジックを挟むことも可能です）
    const householdDishes = await prisma.dish.findMany({
      where: { householdId: householdId },
      include: { tags: true },
    });

    if (householdDishes.length === 0) {
      return new Response(
        JSON.stringify({ error: "登録されているメニューがありません。先にメニューを追加してください。" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Geminiへのプロンプト作成（家族の全員の希望とメニュー一覧を渡す）
    const requestsSummary = requests.map((r) => {
      const userName = r.user.name || '家族の誰か';
      const typeText = r.type === 'WANT' ? `食べたい: ${r.dish?.name || r.keyword || '特になし'}` :
                       r.type === 'NG' ? `避けたい（NG）: ${r.dish?.name || r.keyword || '特になし'}` : 'なんでもいい';
      return `- ${userName}: ${typeText}`;
    }).join('\n');

    const dishesSummary = householdDishes.map((d) => `- ${d.name} (タグ: ${d.tags.map(t => t.name).join(', ')})`).join('\n');

    const prompt = `あなたは親しみやすくておしゃべりな専属シェフアシスタントです。
以下の「家族の今日の希望」と「登録されているメニュー一覧」をすべて考慮し、今日作るべき料理をメニュー一覧の中から1つ選んでください。

【家族の希望一覧】
${requestsSummary}

【メニュー一覧】
${dishesSummary}

家族全員の意見（WANTやNG）を上手に汲み取り、なぜその料理に決めたのかの理由を、まるで友達や家族に話しかけるように温かみのあるトーンで120〜150文字程度で教えてください。`;

    let selectedDish: DishWithTags = householdDishes[0];
    let reasonText = `家族みんなの希望をバランスよく考えて、本日は「${selectedDish.name}」に決定しました！楽しく食べてくださいね！`;
    let isAiSuccess = false;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchedDishName: { type: Type.STRING, description: "メニュー一覧の中から選ばれた料理の名前" },
              reason: { type: Type.STRING, description: "選んだ理由や家族の意見を調停したコメント" },
            },
            required: ["matchedDishName", "reason"],
          },
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        if (parsed.matchedDishName) {
          const found = householdDishes.find((d) => d.name === parsed.matchedDishName);
          if (found) {
            selectedDish = found;
          }
        }
        if (parsed.reason) {
          reasonText = parsed.reason;
          isAiSuccess = true;
        }
      }
    } catch (aiError) {
      console.error("Gemini APIのAI調停に失敗しました:", aiError);
    }

    // 4. 調停結果を履歴（DishShowLog）に保存
    await prisma.dishShowLog.create({
      data: {
        householdId: householdId,
        dishId: selectedDish.id,
        keyword: "AI調停",
      },
    });

    return new Response(
      JSON.stringify({
        dish: {
          id: selectedDish.id,
          name: selectedDish.name,
          imageUrl: selectedDish.imageUrl || null,
        },
        reason: reasonText,
        isAiGeneration: isAiSuccess,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Mediate API Error:", error);
    return new Response(
      JSON.stringify({ error: "AI調停によるメニューの決定に失敗しました。" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
