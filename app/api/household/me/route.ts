import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証されていません。' }, { status: 401 });
    }

    // ユーザーが所属している世帯メンバー情報を検索
    const member = await prisma.householdMember.findUnique({
      where: { userId: user.id },
      include: { household: true }, // 世帯の詳細情報も一緒に取得
    });

    if (!member) {
      return NextResponse.json({ hasHousehold: false });
    }

    return NextResponse.json({
      hasHousehold: true,
      household: member.household,
      role: member.role,
    });
  } catch (error: unknown) {
    console.error('世帯所属確認エラー:', error);
    return NextResponse.json({ error: '世帯情報の取得に失敗しました。' }, { status: 500 });
  }
}
