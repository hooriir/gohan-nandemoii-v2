import { NextResponse } from 'next/server';
import { PrismaClient, HouseholdRole } from '@prisma/client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: '招待コードを入力してください。' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証されていません。' }, { status: 401 });
    }

    const existingMember = await prisma.householdMember.findUnique({
      where: { userId: user.id },
    });
    if (existingMember) {
      return NextResponse.json({ error: 'すでに別の世帯に所属しています。' }, { status: 400 });
    }

    const invite = await prisma.householdInvite.findUnique({
      where: { code: code.trim() },
      include: { household: true },
    });

    if (!invite) {
      return NextResponse.json({ error: '無効な招待コードです。' }, { status: 404 });
    }

    const now = new Date();
    if (invite.expiresAt < now || invite.revokedAt || invite.useCount >= invite.maxUses) {
      return NextResponse.json({ error: 'この招待コードは有効期限切れ、または上限に達しています。' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.householdMember.create({
        data: {
          householdId: invite.householdId,
          userId: user.id,
          role: HouseholdRole.MEMBER,
        },
      });

      await tx.householdInvite.update({
        where: { id: invite.id },
        data: { useCount: { increment: 1 } },
      });
    });

    return NextResponse.json({ success: true, householdName: invite.household.name });
  } catch (error: unknown) {
    console.error('世帯参加エラー:', error);
    return NextResponse.json({ error: '世帯への参加に失敗しました。' }, { status: 500 });
  }
}
