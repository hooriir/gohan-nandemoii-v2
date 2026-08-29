import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
