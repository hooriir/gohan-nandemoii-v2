import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { getJstDayRange } from "@/utils/date";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    const member = await prisma.householdMember.findUnique({
      where: { userId: user.id },
    });

    if (!member) {
      return NextResponse.json({ error: "世帯に所属していません。" }, { status: 400 });
    }

    // 日本時間(JST)の本日 00:00:00 〜 23:59:59.999 の範囲を取得
    const { start, end } = getJstDayRange();

    const todayLog = await prisma.dishShowLog.findFirst({
      where: {
        householdId: member.householdId,
        createdAt: {
          gte: start,
          lte: end,
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
      return NextResponse.json({ decided: false });
    }

    return NextResponse.json({
      decided: true,
      dish: {
        id: todayLog.dishId,
        name: todayLog.dish?.name || "今日のごはん",
        imageUrl: todayLog.dish?.imageUrl || null,
        reason: todayLog.keyword || "家族みんなの希望から決定しました！",
      },
    });
  } catch (error) {
    console.error("Fetch Today DishShowLog Error:", error);
    return NextResponse.json(
      { error: "決定ログの取得に失敗しました。" },
      { status: 500 }
    );
  }
}
