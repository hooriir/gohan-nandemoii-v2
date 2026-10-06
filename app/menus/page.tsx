import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import MenuListManager from "@/components/MenuListManager";
import { getCurrentUserContext } from "@/lib/getCurrentUserContext";

export const revalidate = 0;

export default async function MenusPage() {
  // Server Component 用ヘルパーからユーザーコンテキストを取得
  const userContext = await getCurrentUserContext();

  // 未ログインの場合はログインページへ
  if (!userContext || !userContext.user) {
    redirect("/login");
  }

  // 世帯に所属していない場合は世帯作成ページへ
  if (!userContext.householdName) {
    redirect("/household/create");
  }

  // ユーザーの世帯所属情報を取得
  const member = await prisma.householdMember.findFirst({
    where: { userId: userContext.user.id },
    select: { householdId: true },
  });

  if (!member) {
    redirect("/household/create");
  }

  // 世帯IDに紐づく料理一覧を取得
  const dishes = await prisma.dish.findMany({
    where: { householdId: member.householdId },
    include: { tags: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="bg-brand-bg min-h-screen p-4 sm:p-8 flex flex-col items-center font-sans">
      <Header
        userName={userContext.userName}
        householdName={userContext.householdName}
        isOwner={userContext.isOwner}
      />

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
