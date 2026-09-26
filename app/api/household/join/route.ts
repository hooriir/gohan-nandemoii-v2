import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証されていません。" }, { status: 401 });
    }

    const { inviteCode } = await request.json();
    if (!inviteCode) {
      return NextResponse.json({ error: "招待コードが必要です。" }, { status: 400 });
    }

    // 1. 招待コードに対応する世帯を取得
    const { data: household, error: fetchError } = await supabase
      .from("households")
      .select("id")
      .eq("invite_code", inviteCode)
      .single();

    if (fetchError || !household) {
      return NextResponse.json({ error: "無効な招待コードです。" }, { status: 404 });
    }

    // 2. 一般メンバー（MEMBER）として世帯に追加
    const { error: joinError } = await supabase
      .from("household_members")
      .insert([
        {
          household_id: household.id,
          user_id: user.id,
          role: "MEMBER", // 後から参加した人は一般メンバー
        },
      ]);

    if (joinError) {
      return NextResponse.json({ error: "世帯への加入に失敗しました。" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}
