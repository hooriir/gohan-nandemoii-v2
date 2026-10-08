import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { getJstDateOnly, getJstDayRange } from "@/utils/date";

// ヘルパー: セッション/ユーザーを軽量・安全に取得（ConnectTimeoutError対策）
async function getAuthUser() {
  const supabase = await createClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (!sessionError && session?.user) {
    return session.user;
  }
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;
  return user;
}

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    const member = await prisma.householdMember.findFirst({
      where: { userId: user.id },
    });

    if (!member) {
      return NextResponse.json({ error: "世帯に所属していません。" }, { status: 400 });
    }

    const householdId = member.householdId;

    // 日本時間の本日の範囲を取得
    const { start, end } = getJstDayRange();

    // メンバー一覧と希望一覧を並列取得で高速化
    const [householdMembers, requests] = await Promise.all([
      prisma.householdMember.findMany({
        where: { householdId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
      prisma.mealRequest.findMany({
        where: {
          householdId,
          requestDate: {
            gte: start,
            lte: end,
          },
        },
        include: {
          dish: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    // O(1) で高速アクセスできる Map 化
    const requestMap = new Map(requests.map((r) => [r.userId, r]));

    const result = householdMembers.map((m) => {
      const userRequest = requestMap.get(m.userId);
      return {
        userId: m.userId,
        email: m.user.email,
        request: userRequest
          ? {
              type: userRequest.type,
              keyword: userRequest.keyword,
              dishName: userRequest.dish?.name || null,
            }
          : null,
      };
    });

    return NextResponse.json({ requests: result });
  } catch (error) {
    console.error("Fetch Meal Requests Error:", error);
    return NextResponse.json(
      { error: "家族の希望の取得に失敗しました。" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    const member = await prisma.householdMember.findFirst({
      where: { userId: user.id },
    });

    if (!member) {
      return NextResponse.json({ error: "世帯に所属していません。" }, { status: 400 });
    }

    const body = await request.json();
    const { type, keyword, dishId } = body;

    // 日本時間の本日00:00:00の日付オブジェクト
    const requestDate = getJstDateOnly();

    const mealRequest = await prisma.mealRequest.upsert({
      where: {
        householdId_userId_requestDate: {
          householdId: member.householdId,
          userId: user.id,
          requestDate: requestDate,
        },
      },
      update: {
        type: type || "WANT",
        keyword: keyword || null,
        dishId: dishId || null,
      },
      create: {
        householdId: member.householdId,
        userId: user.id,
        requestDate: requestDate,
        type: type || "WANT",
        keyword: keyword || null,
        dishId: dishId || null,
      },
    });

    return NextResponse.json({ success: true, mealRequest });
  } catch (error) {
    console.error("Save Meal Request Error:", error);
    return NextResponse.json(
      { error: "希望の保存に失敗しました。" },
      { status: 500 }
    );
  }
}
