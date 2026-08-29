import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "認証が必要です。" }),
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const memberIds = householdMembers.map((m) => m.userId);
    const requests = await prisma.mealRequest.findMany({
      where: {
        userId: { in: memberIds },
        requestDate: today,
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

    return new Response(
      JSON.stringify({ requests: result }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Fetch Meal Requests Error:", error);
    return new Response(
      JSON.stringify({ error: "家族の希望の取得に失敗しました。" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
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
      return new Response(
        JSON.stringify({ error: "認証が必要です。" }),
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

    const body = await request.json();
    const { type, keyword, dishId } = body;

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
    const requestDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - 9 * 60 * 60 * 1000);

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

    return new Response(
      JSON.stringify({ success: true, mealRequest }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Save Meal Request Error:", error);
    return new Response(
      JSON.stringify({ error: "希望の保存に失敗しました。" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
