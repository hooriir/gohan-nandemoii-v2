import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "認証されていません。ログインしてください。" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { inviteCode } = body;

    if (!inviteCode || typeof inviteCode !== "string") {
      return NextResponse.json(
        { error: "招待コードを入力してください。" },
        { status: 400 }
      );
    }

    const trimmedCode = inviteCode.trim().toUpperCase();

    // 2. Prisma + HouseholdInvite 参照
    const invite = await prisma.householdInvite.findUnique({
      where: { code: trimmedCode },
      include: {
        household: true,
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "無効な招待コードです。" },
        { status: 404 }
      );
    }

    // 3. 招待の有効性を検証
    if (invite.revokedAt !== null) {
      return NextResponse.json(
        { error: "この招待コードは無効化されています。" },
        { status: 400 }
      );
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "この招待コードは有効期限が切れています。" },
        { status: 400 }
      );
    }

    if (
      invite.maxUses !== null &&
      invite.useCount !== null &&
      invite.useCount >= invite.maxUses
    ) {
      return NextResponse.json(
        { error: "この招待コードは使用上限に達しています。" },
        { status: 400 }
      );
    }

    // 4. 既所属チェック
    const existing = await prisma.householdMember.findUnique({
      where: { userId: user.id },
    });

    if (existing) {
      return NextResponse.json(
        { error: "既に世帯に所属しています。" },
        { status: 409 }
      );
    }

    // User レコードの存在確認・自動補正（FK制約エラー防止）
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      const displayName =
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "ユーザー";

      await prisma.user.upsert({
        where: { id: user.id },
        update: { email: user.email || "" },
        create: {
          id: user.id,
          email: user.email || "",
          name: displayName,
          password: "AUTH_USER",
        },
      });
    }

    // 5. 加入処理をトランザクションにする
    await prisma.$transaction([
      prisma.householdMember.create({
        data: {
          householdId: invite.householdId,
          userId: user.id,
          role: "MEMBER",
        },
      }),
      prisma.householdInvite.update({
        where: { id: invite.id },
        data: {
          useCount: { increment: 1 },
        },
      }),
    ]);

    return NextResponse.json(
      { message: "世帯に参加しました。", householdId: invite.householdId },
      { status: 200 }
    );
  } catch (error) {
    console.error("世帯参加処理エラー:", error);
    return NextResponse.json(
      { error: "世帯への参加処理中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
