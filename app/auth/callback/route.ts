import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  const supabase = await createClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("exchange失敗:", exchangeError);
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email.split("@")[0] ||
    "ユーザー";

  // ID または Email で既存ユーザーを検索
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ id: user.id }, { email: user.email }],
    },
  });

  if (existingUser) {
    // 既存ユーザーがいる場合は ID・Email・名前を同期更新
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        id: user.id,
        email: user.email,
        name: displayName,
      },
    });
  } else {
    // レコードが存在しない場合のみ新規作成
    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        name: displayName,
        password: "GOOGLE_OAUTH_USER",
      },
    });
  }

  const destination =
    next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return NextResponse.redirect(new URL(destination, origin));
}
