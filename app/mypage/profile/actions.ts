"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function leaveHousehold() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "ログインが必要です" };
  }

  // 所属メンバー情報を取得
  const member = await prisma.householdMember.findFirst({
    where: { userId: user.id },
    include: {
      household: {
        include: {
          members: true,
        },
      },
    },
  });

  if (!member) {
    return { error: "所属している世帯が見つかりません" };
  }

  // オーナーかつ他にメンバーがいる場合の脱退制限
  if (member.role === "OWNER" && member.household.members.length > 1) {
    return {
      error:
        "オーナーは他のメンバーがいる状態では脱退できません。別のメンバーに譲渡するか、メンバーを削除してください。",
    };
  }

  // 脱退処理（世帯メンバーレコードを削除）
  await prisma.householdMember.delete({
    where: { id: member.id },
  });

  // 世帯に誰もいなくなった場合は世帯自体を削除
  if (member.household.members.length === 1) {
    await prisma.household.delete({
      where: { id: member.householdId },
    });
  }

  revalidatePath("/", "layout");
  redirect("/household/create");
}
