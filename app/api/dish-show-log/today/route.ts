import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/client";

export async function GET() {
  try {
    const supabase = createClient();
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
        JSON.stringify({ error: "世帯に所属していません。" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const householdId = member.householdId;

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const parts = formatter.formatToParts(new Date());
    const year = parseInt(parts.find((p) => p.type === "year")!.value);
    const month = parseInt(parts.find((p) => p.type === "month")!.value) - 1;
    const day = parseInt(parts.find((p) => p.type === "day")!.value);

    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - 9 * 60 * 60 * 1000);
    const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - 9 * 60 * 60 * 1000);

    const todayLog = await prisma.dishShowLog.findFirst({
      where: {
        householdId: householdId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        dish: true,
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
          reason: todayLog.keyword,
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
