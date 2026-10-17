import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { getJstDateOnly } from "@/utils/date";

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

// ==========================================
// GET: ログインユーザー本人の本日の希望を取得
// ==========================================
export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
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

    // 日本時間の本日日付文字列（YYYY-MM-DD）を取得
    const today = getJstDateOnly();

    const myRequest = await prisma.mealRequest.findFirst({
      where: {
        householdId: currentMember.householdId,
        userId: user.id,
        requestDate: today,
      },
      select: {
        id: true,
        type: true,
        keyword: true,
        requestDate: true,
        createdAt: true,
        dish: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ request: myRequest });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "予期せぬエラーが発生しました";
    console.error("MealRequest ME GET Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
