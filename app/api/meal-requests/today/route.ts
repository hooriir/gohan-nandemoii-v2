import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { getJstDateOnly, getJstDayRange } from "@/utils/date";

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

    const householdId = member.householdId;

    const householdMembers = await prisma.householdMember.findMany({
      where: { householdId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    // 日本時間の本日の範囲（00:00:00 〜 23:59:59）を取得
    const { start, end } = getJstDayRange();

    const memberIds = householdMembers.map((m) => m.userId);
    const requests = await prisma.mealRequest.findMany({
      where: {
        userId: { in: memberIds },
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
    });

    const result = householdMembers.map((m) => {
      const userRequest = requests.find((r) => r.userId === m.userId);
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
