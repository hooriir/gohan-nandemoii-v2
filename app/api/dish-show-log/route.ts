import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

// 日本時間（JST）の「今日の始まり」と「今日の終わり」を取得するヘルパー関数
function getTodayJstRange() {
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

  return { startOfDay, endOfDay };
}

// 【GET】本日の決定結果を取得する
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "認証が必要です。ログインしてください。" },
        { status: 401 }
      );
    }

    const member = await prisma.householdMember.findUnique({
      where: { userId: user.id },
    });

    if (!member) {
      return NextResponse.json(
        { error: "世帯に所属していません。" },
        { status: 400 }
      );
    }

    const { startOfDay, endOfDay } = getTodayJstRange();

    const todayLog = await prisma.dishShowLog.findFirst({
      where: {
        householdId: member.householdId,
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
      return NextResponse.json({ exists: false, data: null });
    }

    return NextResponse.json({
      exists: true,
      data: {
        id: todayLog.id,
        dish: todayLog.dish
          ? {
              id: todayLog.dish.id,
              name: todayLog.dish.name,
              imageUrl: todayLog.dish.imageUrl || null,
            }
          : {
              id: null,
              name: "今日のごはん",
              imageUrl: null,
            },
        reason: todayLog.keyword,
        createdAt: todayLog.createdAt,
      },
    });
  } catch (error) {
    console.error("Fetch Today Log Error:", error);
    return NextResponse.json(
      { error: "本日の決定履歴の取得に失敗しました。" },
      { status: 500 }
    );
  }
}

// 【POST】決定した料理をDishShowLogに登録・保存する
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "認証が必要です。ログインしてください。" },
        { status: 401 }
      );
    }

    const member = await prisma.householdMember.findUnique({
      where: { userId: user.id },
    });

    if (!member) {
      return NextResponse.json(
        { error: "世帯に所属していません。" },
        { status: 400 }
      );
    }

    const { dishId, dishName, reason } = await req.json();

    let targetDishId = dishId;

    // もし dishId が直接渡されていない場合、dishName から検索するか新規登録する
    if (!targetDishId && dishName) {
      let existingDish = await prisma.dish.findFirst({
        where: {
          householdId: member.householdId,
          name: dishName,
        },
      });

      if (!existingDish) {
        existingDish = await prisma.dish.create({
          data: {
            householdId: member.householdId,
            name: dishName,
            createdById: user.id, // 必須プロパティを追加
          },
        });
      }
      targetDishId = existingDish.id;
    }

    if (!targetDishId) {
      return NextResponse.json(
        { error: "保存対象の料理情報が見つかりません。" },
        { status: 400 }
      );
    }

    // 本日の決定ログを登録
    const newLog = await prisma.dishShowLog.create({
      data: {
        householdId: member.householdId,
        dishId: targetDishId,
        keyword: reason || "決定されたごはん",
      },
      include: {
        dish: true,
      },
    });

    return NextResponse.json({
      success: true,
      log: newLog,
    });
  } catch (error) {
    console.error("Save Today Log Error:", error);
    return NextResponse.json(
      { error: "決定ログの保存に失敗しました。" },
      { status: 500 }
    );
  }
}
