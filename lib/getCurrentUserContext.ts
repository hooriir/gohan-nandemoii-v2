import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export const getCurrentUserContext = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // ユーザーの表示名を取得（メタデータ name -> メールアドレスのアカウント名 -> デフォルト名）
  const userName =
    user.user_metadata?.name || user.email?.split("@")[0] || "ユーザー";

  const member = await prisma.householdMember.findFirst({
    where: { userId: user.id },
    include: { household: { select: { name: true } } },
  });

  return {
    user,
    userName,
    householdName: member?.household?.name ?? null,
    isOwner: member?.role === "OWNER",
  };
});
