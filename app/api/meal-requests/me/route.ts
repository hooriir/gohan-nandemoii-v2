import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * 日本時間（JST）における「本日の00:00:00」のDateオブジェクトを算出する関数
 */
function getTodayJst(): Date {
  const now = new Date();
  // UTC時間から日本時間（JST: UTC+9）の年月日を取得
  const jstString = now.toLocaleDateString("en-US", { timeZone: "Asia/Tokyo" });
  // JSTの「00:00:00」としてDateオブジェクトを作成
  return new Date(`${jstString} 00:00:00`);
}

// ==========================================
// GET: ログインユーザー本人の本日の希望を取得
// ==========================================
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    const currentMember = await prisma.householdMember.findFirst({
      where: { userId: user.id },
    });

    if (!currentMember) {
      return NextResponse.json({ error: "世帯に所属していません" }, { status: 400 });
    }

    // 日本時間の本日（00:00:00）の日付を取得
    const today = getTodayJst();

    const myRequest = await prisma.mealRequest.findFirst({
      where: {
        householdId: currentMember.householdId,
        userId: user.id,
        requestDate: today,
      },
      include: {
        dish: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({ request: myRequest });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "予期せぬエラーが発生しました";
    console.error("MealRequest ME GET Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
