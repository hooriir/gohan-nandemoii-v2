import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
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

    // 所属世帯の取得
    const member = await prisma.householdMember.findUnique({
      where: { userId: user.id },
    });

    if (!member) {
      return new Response(
        JSON.stringify({ error: "世帯に所属していません。" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const householdId = member.householdId;

    // 本日の日付範囲（0:00:00 〜 23:59:59）を設定
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 世帯単位で「今日」作られた DishShowLog を検索（料理のデータも一緒に取得）
    const todayLog = await prisma.dishShowLog.findFirst({
      where: {
        householdId: householdId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        dish: true, // 紐づく料理情報（名前や画像）も一緒に取る
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!todayLog) {
      return new Response(
        JSON.stringify({ exists: false, data: null }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        exists: true,
        data: {
          id: todayLog.id,
          dish: {
            id: todayLog.dish.id,
            name: todayLog.dish.name,
            imageUrl: todayLog.dish.imageUrl || null,
          },
          reason: todayLog.keyword, // AI調停の理由やキーワードとして保存されていたもの
          createdAt: todayLog.createdAt,
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Fetch Today Log Error:", error);
    return new Response(
      JSON.stringify({ error: "本日の決定履歴の取得に失敗しました。" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
