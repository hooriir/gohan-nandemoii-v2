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

    const userId = user.id;

    // 所属世帯の取得
    const member = await prisma.householdMember.findUnique({
      where: { userId: userId },
    });

    if (!member) {
      return new Response(
        JSON.stringify({ error: "世帯に所属していません。世帯を作成または参加してください。" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const householdId = member.householdId;

    const body = await request.json();
    const { keyword } = body;

    const cleanKeyword = keyword?.trim() || "なんでもいい";
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // 世帯の最近の表示履歴を取得
    const recentLogs = await prisma.dishShowLog.findMany({
      where: {
        householdId: householdId,
        createdAt: { gte: oneWeekAgo },
      },
      select: { dishId: true },
      orderBy: { createdAt: "desc" },
    });

    const excludedDishIds = recentLogs.map((log) => log.dishId);

    // 世帯に紐づくメニューを取得
    const householdDishes = await prisma.dish.findMany({
      where: { householdId: householdId },
      include: { tags: true },
    });

    if (householdDishes.length === 0) {
      return new Response(
        JSON.stringify({
          error: "登録されているメニューがありません。先にメニューを追加してください。",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const availableDishes = householdDishes.filter(
      (dish) => !excludedDishIds.includes(dish.id)
    );

    let targetDishes: DishWithTags[] = [];

    if (cleanKeyword === "なんでもいい") {
      targetDishes = availableDishes.length > 0 ? availableDishes : householdDishes;
    } else {
      const searchKeywords = cleanKeyword
        .replace(/[,，、]/g, " ")
        .split(/\s+/)
        .filter((k: string) => k.length > 0);

      const filterFn = (dish: DishWithTags) =>
        searchKeywords.some((kw: string) =>
          dish.name.includes(kw) ||
          dish.tags.some((t) => t.name.includes(kw))
        );

      const matchedAvailable = availableDishes.filter(filterFn);

      if (matchedAvailable.length > 0) {
        targetDishes = matchedAvailable;
      } else {
        const matchedAll = householdDishes.filter(filterFn);

        if (matchedAll.length > 0) {
          targetDishes = matchedAll;
        } else {
          targetDishes = householdDishes.length > 0 ? householdDishes : availableDishes;
        }
      }
    }

    const selectedDish =
      targetDishes[Math.floor(Math.random() * targetDishes.length)];

    const prompt = `あなたは親しみやすくておしゃべりな専属シェフアシスタントです。
ユーザーの今の気分・要望: 「${cleanKeyword}」
今日選ばれた料理: 「${selectedDish.name}」

この料理がユーザーの要望や今の気分にどうしてぴったりなのか、まるで友達や家族に話しかけるように、温かみのあるトーンで120〜150文字程度の少し長めの文章で「おすすめの理由」を教えてください。
毎回、違った切り口やユーモアを交えて、新鮮味のあるコメントにしてください。`;

    let isAiSuccess = false;
    const fallbackTemplates = [
      `「${cleanKeyword}」の気分なら、やっぱり${selectedDish.name}が最高ですね！美味しく食べて元気を出しましょう！`,
      `本日は「${cleanKeyword}」に合わせて、${selectedDish.name}をチョイスしました。楽しい食卓にしてくださいね！`,
      `「${cleanKeyword}」というリクエストにお応えして、今日は${selectedDish.name}で決まりです！`,
    ];
    let reasonText = fallbackTemplates[Math.floor(Math.random() * fallbackTemplates.length)];

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reason: { type: Type.STRING },
            },
            required: ["reason"],
          },
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        if (parsed.reason) {
          reasonText = parsed.reason;
          isAiSuccess = true;
        }
      }
    } catch (aiError) {
      console.error("Gemini APIの理由生成に失敗しました:", aiError);
    }

    await prisma.dishShowLog.create({
      data: {
        householdId: householdId,
        dishId: selectedDish.id,
        keyword: reasonText,
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
    console.error("Recommend API Error:", error);
    return new Response(
      JSON.stringify({ error: "メニューの決定に失敗しました。" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
