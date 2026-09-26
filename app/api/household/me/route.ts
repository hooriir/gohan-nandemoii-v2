import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ hasHousehold: false }, { status: 401 });
    }

    // Prisma を使って所属世帯と世帯情報を一括取得
    const memberData = await prisma.householdMember.findFirst({
      where: { userId: user.id },
      include: {
        household: true, // Household テーブルの情報を結合
      },
    });

    if (!memberData) {
      return NextResponse.json({ hasHousehold: false });
    }

    // role が "OWNER" かどうかを判定
    const isOwner = memberData.role === "OWNER";

    return NextResponse.json({
      hasHousehold: true,
      householdId: memberData.householdId,
      role: memberData.role, // "OWNER" または "MEMBER"
      isOwner, // ← 代表者フラグ (boolean)
      householdName: memberData.household?.name || "",
      deadlineMessage: memberData.household?.deadlineMessage || "午後4時までに決めてね", // 👈 追加
      household: memberData.household, // Header参照用オブジェクト
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました。" },
      { status: 500 }
    );
  }
}
