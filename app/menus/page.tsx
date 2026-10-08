import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import MenuListManager from "@/components/MenuListManager";
import { getCurrentUserContext } from "@/lib/getCurrentUserContext";

export const revalidate = 0;

export default async function MenusPage() {
  // 1. サーバー側でユーザーコンテキストを取得
  const userContext = await getCurrentUserContext();

  // 未ログインの場合はログインページへ
  if (!userContext || !userContext.user) {
    redirect("/login");
  }

  // 世帯に所属していない（householdIdが存在しない）場合は世帯作成ページへ
  if (!userContext.householdId) {
    redirect("/household/create");
  }

  // 2. ユーザーの世帯IDを直接利用して料理一覧を取得（重複クエリを削除）
  const dishes = await prisma.dish.findMany({
    where: { householdId: userContext.householdId },
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
