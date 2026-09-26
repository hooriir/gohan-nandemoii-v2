import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * 日本時間（JST）における「本日の00:00:00」のDateオブジェクトを算出する関数
 */
function getTodayJst(): Date {
  const now = new Date();
  // UTC時間から日本時間（JST: UTC+9）の年月日を取得
  const jstString = now.toLocaleDateString("en-US", { timeZone: "Asia/Tokyo" });
  // JSTの「00:00:00」としてDateオブジェクトを作成
  return new Date(`${jstString} 00:00:00`);
}

// ==========================================
// GET: 同じ世帯のメンバー全員の本日の希望一覧を取得
// ==========================================
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    // 1. ログインユーザーの世帯情報を取得
    const currentMember = await prisma.householdMember.findFirst({
      where: { userId: user.id },
    });

    if (!currentMember) {
      return NextResponse.json({ error: "世帯に所属していません" }, { status: 400 });
    }

    // 2. 日本時間の本日（00:00:00）の日付を取得
    const today = getTodayJst();

    // 3. 同じ世帯の全メンバー情報と本日の希望（MealRequest）を並列処理で取得
    const [members, todayRequests] = await Promise.all([
      prisma.householdMember.findMany({
        where: {
          householdId: currentMember.householdId,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.mealRequest.findMany({
        where: {
          householdId: currentMember.householdId,
          requestDate: today,
        },
        include: {
          dish: {
            select: { name: true },
          },
        },
      }),
    ]);

    // Mapを作成して高速に紐付け
    const requestMap = new Map(todayRequests.map((req) => [req.userId, req]));

    // 4. フロントエンド（family-summary）の型に合わせたデータ構造に整形
    const formattedMembers = members.map((m) => {
      const req = requestMap.get(m.userId);
      return {
        userId: m.userId,
        userName: m.user?.name || m.user?.email?.split("@")[0] || "メンバー",
        role: m.role, // "OWNER" または "MEMBER"
        request: req
          ? {
              type: req.type,
              keyword: req.keyword,
              dishName: req.dish?.name || null,
            }
          : null,
      };
    });

    return NextResponse.json({ members: formattedMembers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "予期せぬエラーが発生しました";
    console.error("MealRequest GET Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ==========================================
// POST: 自分の本日の希望を登録・更新
// ==========================================
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    const body = await request.json();
    const { type, keyword } = body;

    const householdMember = await prisma.householdMember.findFirst({
      where: { userId: user.id },
    });

    if (!householdMember) {
      return NextResponse.json({ error: "世帯に所属していません" }, { status: 400 });
    }

    // 日本時間の本日（00:00:00）の日付を取得
    const today = getTodayJst();

    const mealRequest = await prisma.mealRequest.upsert({
      where: {
        householdId_userId_requestDate: {
          householdId: householdMember.householdId,
          userId: user.id,
          requestDate: today,
        },
      },
      update: {
        type,
        keyword: keyword || null,
        dishId: null,
      },
      create: {
        householdId: householdMember.householdId,
        userId: user.id,
        requestDate: today,
        type,
        keyword: keyword || null,
      },
    });

    return NextResponse.json({ success: true, mealRequest });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "予期せぬエラーが発生しました";
    console.error("MealRequest Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
