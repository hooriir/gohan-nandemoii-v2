import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // ユーザーの世帯情報と権限を取得
    const member = await prisma.householdMember.findFirst({
      where: { userId: user.id },
    });

    if (!member) {
      return NextResponse.json({ error: "世帯に所属していません" }, { status: 404 });
    }

    // 代表者（OWNER）権限チェック
    if (member.role !== "OWNER") {
      return NextResponse.json({ error: "代表者のみ変更可能です" }, { status: 403 });
    }

    const { message } = await request.json();

    // 世帯の deadlineMessage を更新
    const updatedHousehold = await prisma.household.update({
      where: { id: member.householdId },
      data: { deadlineMessage: message },
    });

    return NextResponse.json({
      success: true,
      deadlineMessage: updatedHousehold.deadlineMessage,
    });
  } catch (error) {
    console.error("Update Message Error:", error);
    return NextResponse.json({ error: "メッセージの更新に失敗しました" }, { status: 500 });
  }
}
