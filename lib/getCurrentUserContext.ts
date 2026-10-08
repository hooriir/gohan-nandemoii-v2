import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { cache } from "react";

export type UserContext = {
  user: {
    id: string;
    email?: string;
  };
  userName: string;
  householdId: string | null;
  householdName: string | null;
  role: string | null;
  isOwner: boolean;
  isGoogleUser: boolean;
};

export const getCurrentUserContext = cache(async (): Promise<UserContext | null> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // Googleプロバイダー判定（safe access）
    const isGoogleUser =
      user.app_metadata?.provider === "google" ||
      (Array.isArray(user.identities) &&
        user.identities.some((identity) => identity.provider === "google")) ||
      false;

    // ユーザーの世帯所属情報を取得
    const member = await prisma.householdMember.findFirst({
      where: { userId: user.id },
      include: {
        household: {
          select: { id: true, name: true },
        },
        user: {
          select: { name: true },
        },
      },
    });

    const userName =
      member?.user?.name ||
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "ユーザー";

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      userName,
      householdId: member?.householdId ?? null,
      householdName: member?.household?.name ?? null,
      role: (member as Record<string, unknown> | null)?.role as string | null ?? null,
      isOwner: (member as Record<string, unknown> | null)?.role === "OWNER",
      isGoogleUser,
    };
  } catch (error) {
    console.error("getCurrentUserContext Error:", error);
    return null;
  }
});
