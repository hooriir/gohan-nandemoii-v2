
import { NextResponse } from 'next/server';
import { PrismaClient, HouseholdRole } from '@prisma/client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: '世帯名は必須です。' }, { status: 400 });
    }

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
      return NextResponse.json({ error: '認証されていません。ログインしてください。' }, { status: 401 });
    }

    const userId = user.id;

    const existingMember = await prisma.householdMember.findUnique({
      where: { userId },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'すでに別の世帯に所属しています。' },
        { status: 400 }
      );
    }

    const newHousehold = await prisma.$transaction(async (tx) => {
      const household = await tx.household.create({
        data: { name },
      });

      await tx.householdMember.create({
        data: {
          householdId: household.id,
          userId,
          role: HouseholdRole.OWNER,
        },
      });

      return household;
    });

    return NextResponse.json({
      success: true,
      household: newHousehold,
    });
  } catch (error: unknown) {
    console.error('世帯作成エラー:', error);
    return NextResponse.json(
      { error: '世帯の作成に失敗しました。' },
      { status: 500 }
    );
  }
}
