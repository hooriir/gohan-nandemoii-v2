import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function POST() {
  try {
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

    const member = await prisma.householdMember.findUnique({
      where: { userId: user.id },
    });

    if (!member) {
      return NextResponse.json({ error: '世帯に所属していません。' }, { status: 400 });
    }

    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const invite = await prisma.householdInvite.create({
      data: {
        householdId: member.householdId,
        code: inviteCode,
        createdById: user.id,
        expiresAt,
        maxUses: 1,
      },
    });

    return NextResponse.json({ success: true, code: invite.code });
  } catch (error: unknown) {
    console.error('招待コード発行エラー詳細:', error);
    return NextResponse.json({ error: '招待コードの発行に失敗しました。' }, { status: 500 });
  }
}
