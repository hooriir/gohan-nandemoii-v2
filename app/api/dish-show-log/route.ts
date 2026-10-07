import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { getJstDayRange } from "@/utils/date";

// ==========================================
// GET: 本日の決定ログを取得
// ==========================================
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 }
      );
    }

    const currentMember = await prisma.householdMember.findFirst({
      where: { userId: user.id },
      select: { householdId: true },
    });

    if (!currentMember) {
      return NextResponse.json(
        { error: "世帯に所属していません" },
        { status: 400 }
      );
    }

    const { start, end } = getJstDayRange();

    const todayLog = await prisma.dishShowLog.findFirst({
      where: {
        householdId: currentMember.householdId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        dish: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ log: todayLog });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "予期せぬエラーが発生しました";
    console.error("DishShowLog GET Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ==========================================
// POST: 本日の決定ログを登録・更新
// ==========================================
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 }
      );
    }

    const currentMember = await prisma.householdMember.findFirst({
      where: { userId: user.id },
      select: { householdId: true },
    });

    if (!currentMember) {
      return NextResponse.json(
        { error: "世帯に所属していません" },
        { status: 400 }
      );
    }

    let body: { dishId?: string; reason?: string; keyword?: string } = {};
    try {
      body = await request.json();
    } catch {
      // 空リクエスト時は空オブジェクト
    }

    const { dishId, reason, keyword } = body;

    if (!dishId) {
      return NextResponse.json(
        { error: "料理ID（dishId）が指定されていません" },
        { status: 400 }
      );
    }

    const createdLog = await prisma.dishShowLog.create({
      data: {
        householdId: currentMember.householdId,
        dishId: dishId,
        keyword: reason || keyword || null,
      },
      include: {
        dish: true,
      },
    });

    return NextResponse.json({
      success: true,
      log: createdLog,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "予期せぬエラーが発生しました";
    console.error("DishShowLog POST Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ==========================================
// DELETE: 本日の決定ログを削除（リセット）
// ==========================================
export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 }
      );
    }

    const currentMember = await prisma.householdMember.findFirst({
      where: { userId: user.id },
      select: { householdId: true },
    });

    if (!currentMember) {
      return NextResponse.json(
        { error: "世帯に所属していません" },
        { status: 400 }
      );
    }

    const { start, end } = getJstDayRange();

    // 本日作られた決定ログを削除
    await prisma.dishShowLog.deleteMany({
      where: {
        householdId: currentMember.householdId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    return NextResponse.json({ success: true, message: "決定ログをリセットしました" });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "予期せぬエラーが発生しました";
    console.error("DishShowLog DELETE Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
