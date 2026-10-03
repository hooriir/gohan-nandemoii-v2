import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { getJstDateOnly } from "@/utils/date";

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

    // 日本時間の本日00:00:00のDateオブジェクトを取得
    const today = getJstDateOnly();

    const myRequest = await prisma.mealRequest.findFirst({
      where: {
        householdId: currentMember.householdId,
        userId: user.id,
        // @db.Date カラムに対応するため gte/lte または Date オブジェクトで比較
        requestDate: {
          gte: today,
        },
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
