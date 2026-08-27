import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import { createClient } from "@/utils/supabase/server";
import MenuListManager from "@/components/MenuListManager";
import { getHouseholdContext } from "@/lib/household/auth";

export default async function MenusPage() {
  const supabase = await createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  if (!supabaseUser) {
    redirect("/login");
  }

  const userId = supabaseUser.id;
  const displayName =
    supabaseUser.user_metadata?.name ||
    supabaseUser.email?.split("@")[0] ||
    "ユーザー";

  // 1. ユーザー情報のUpsert
  await prisma.user.upsert({
    where: { id: userId },
    update: { email: supabaseUser.email || "" },
    create: {
      id: userId,
      email: supabaseUser.email || "",
      name: displayName,
      password: "AUTH_USER",
    },
  });

  // 2. 共通ヘルパーで世帯コンテキストを取得
  const context = await getHouseholdContext(userId);

  // 世帯に所属していなければ世帯作成画面へリダイレクト
  if (!context) {
    redirect("/household/create");
  }

  // 3. 世帯IDに紐づく料理一覧を取得
  const dishes = await prisma.dish.findMany({
    where: { householdId: context.householdId },
    include: { tags: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="bg-brand-bg min-h-screen p-4 sm:p-8 flex flex-col items-center font-sans">
      <Header />

      <div className="w-full max-w-[900px] flex flex-row gap-6 items-start justify-center">
        <div className="flex-1 bg-white rounded-3xl shadow-xl p-6 sm:p-10 border border-slate-100 w-full min-w-0">
          <h2 className="text-[#54C7F3] text-center text-2xl font-black mb-8 tracking-wider">
            ごはん登録・一覧
          </h2>

          <MenuListManager initialDishes={dishes} />
        </div>
      </div>
    </div>
  );
}
