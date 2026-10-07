import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma"; // 👈 シングルトンインスタンスに変更

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証されていません。" }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "世帯名を入力してください。" }, { status: 400 });
    }

    // すでに世帯に所属しているかチェック
    const existingMember = await prisma.householdMember.findFirst({
      where: { userId: user.id },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "すでに対象の世帯に所属しています。" },
        { status: 400 }
      );
    }

    // トランザクション処理：世帯の作成と作成者のOWNER登録を同時に実行
    const result = await prisma.$transaction(async (tx) => {
      const household = await tx.household.create({
        data: {
          name: name.trim(),
        },
      });

      const member = await tx.householdMember.create({
        data: {
          householdId: household.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      return { household, member };
    });

    return NextResponse.json({ success: true, household: result.household });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "予期せぬエラーが発生しました。";
    console.error("Household creation error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
