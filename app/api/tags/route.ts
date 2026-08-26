import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "認証が必要です。" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 所属世帯の取得
    const member = await prisma.householdMember.findUnique({
      where: { userId: user.id },
    });

    if (!member) {
      return new Response(
        JSON.stringify({ error: "世帯に所属していません。" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 世帯IDに紐づくタグを取得
    const tags = await prisma.tag.findMany({
      where: {
        householdId: member.householdId,
      },
      select: { name: true },
    });

    const tagNames = tags.map((t) => t.name);
    const uniqueKeywords = Array.from(new Set(tagNames));

    const result = uniqueKeywords.map((name) => ({ name }));

    return Response.json(result, { status: 200 });

  } catch (error) {
    console.error("Tags API Error:", error);
    return new Response(
      JSON.stringify({ error: "タグの取得に失敗しました。" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
