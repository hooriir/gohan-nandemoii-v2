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

    const tags = await prisma.tag.findMany({
      where: {
        dishes: {
          some: {
            userId: user.id,
          },
        },
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