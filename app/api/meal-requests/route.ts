import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { getJstDateOnly, getJstDayRange } from "@/utils/date";

// ヘルパー: セッション/ユーザーを軽量に取得
async function getAuthUser() {
  const supabase = await createClient();
  // getSession() でローカルの JWT を優先して取得（外部通信タイムアウトを回避）
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (!sessionError && session?.user) {
    return session.user;
  }
  // セッションで取れない場合のフォールバック
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;
  return user;
}

// ==========================================
// GET: 同じ世帯のメンバー全員の本日の希望一覧を取得
// ==========================================
export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    // 1. ログインユーザーの世帯情報を取得
    const currentMember = await prisma.householdMember.findFirst({
      where: { userId: user.id },
    });

    if (!currentMember) {
      return NextResponse.json({ error: "世帯に所属していません" }, { status: 400 });
    }

    // 2. 日本時間の本日の開始・終了時刻を取得
    const { start, end } = getJstDayRange();

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
          requestDate: {
            gte: start,
            lte: end,
          },
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
    const user = await getAuthUser();

    if (!user) {
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

    // 日本時間の本日（00:00:00Z）の日付オブジェクトを取得
    const today = getJstDateOnly();

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
