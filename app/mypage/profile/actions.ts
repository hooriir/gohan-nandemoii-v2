"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

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
        "世帯主はメンバー全員が脱退してから脱退することができます。",
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

/**
 * アカウント削除（退会）処理
 */
export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "ログインが必要です" };
  }

  // 1. 所属世帯のオーナーチェック & 世帯削除・脱退ハンドリング
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

  if (member) {
    // オーナーかつ他にメンバーがいる場合
    if (member.role === "OWNER" && member.household.members.length > 1) {
      return {
        error:
          "世帯主は他のメンバー全員が脱退してからアカウント削除してください。",
      };
    }

    // メンバーが自分1人のみの世帯の場合は世帯自体を削除
    if (member.household.members.length === 1) {
      await prisma.household.delete({
        where: { id: member.householdId },
      });
    } else {
      // 他にメンバーがいない通常メンバー脱退
      await prisma.householdMember.delete({
        where: { id: member.id },
      });
    }
  }

  // 2. Supabase Auth 側からユーザーを完全削除（Admin API を利用）
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY が設定されていません。");
    return { error: "サーバーの設定エラーが発生しました。" };
  }

  const supabaseAdmin = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: { persistSession: false },
    }
  );

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
    user.id
  );

  if (authError) {
    console.error("Supabase Auth ユーザーの削除エラー:", authError);
    return { error: "アカウントの削除に失敗しました。" };
  }

  // 3. Prisma DB 側から User レコードを削除
  // ※ MealRequest 等の関連テーブルは Schema の Cascade 設定により自動削除されます
  try {
    await prisma.user.delete({
      where: { id: user.id },
    });
  } catch (dbError) {
    console.error("Prisma ユーザーの削除エラー:", dbError);
    // Supabase Auth 側は消えている場合があるためエラーログを出力して続行
  }

  // 4. セッションクリア＆リダイレクト
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
