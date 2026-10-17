import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { getJstDateOnly } from "@/utils/date";

// ヘルパー: セッション/ユーザーを軽量に取得
async function getAuthUser() {
  const supabase = await createClient();
  // getSession() でローカルの JWT を優先して取得（外部通信タイムアウトを回避）
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (!sessionError && session?.user) {
    return session.user;
  }
  // セッションで取れない場合のフォールバック
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;
  return user;
}

// ==========================================
// POST: 自分の本日の希望を登録・更新
// ==========================================
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    const body = await request.json();
    const { type, keyword } = body;

    const householdMember = await prisma.householdMember.findFirst({
      where: { userId: user.id },
    });

    if (!householdMember) {
      return NextResponse.json({ error: "世帯に所属していません" }, { status: 400 });
    }

    // 日本時間の本日（YYYY-MM-DD）の日付文字列を取得
    const today = getJstDateOnly();

    const mealRequest = await prisma.mealRequest.upsert({
      where: {
        householdId_userId_requestDate: {
          householdId: householdMember.householdId,
          userId: user.id,
          requestDate: today,
        },
      },
      update: {
        type,
        keyword: keyword || null,
        dishId: null,
      },
      create: {
        householdId: householdMember.householdId,
        userId: user.id,
        requestDate: today,
        type,
        keyword: keyword || null,
      },
    });

    return NextResponse.json({ success: true, mealRequest });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "予期せぬエラーが発生しました";
    console.error("MealRequest Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
