import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { prisma } from "@/lib/prisma";
import MyDishForm from "@/components/my-dish/MyDishForm";
import { getJstDateOnly } from "@/utils/date";
import { getCurrentUserContext } from "@/lib/getCurrentUserContext";

export const revalidate = 0;

export default async function MyDishPage() {
  // 1. Server Component 用ヘルパーからユーザーコンテキストを取得
  const userContext = await getCurrentUserContext();

  // 未ログインの場合はログインページへ
  if (!userContext || !userContext.user) {
    redirect("/login");
  }

  // 世帯に所属していない場合は世帯作成ページへ
  if (!userContext.householdId) {
    redirect("/household/create");
  }

  const { householdId, user, userName, householdName, isOwner } = userContext;
  const today = getJstDateOnly();

  // 2. 本日の自分の希望、タグ、および「世帯のメニュー一覧」を並列取得
  // （除外したいメニューやキーワードを選択肢にするため、dishes も取得します）
  const [myRequest, tags, householdDishes] = await Promise.all([
    prisma.mealRequest.findFirst({
      where: {
        householdId,
        userId: user.id,
        requestDate: today,
      },
      include: {
        dish: { select: { id: true, name: true, imageUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tag.findMany({
      where: { householdId },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.dish.findMany({
      where: { householdId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // 3. 初期表示用のリクエスト情報を整形
  let initialResult = null;
  if (myRequest) {
    const displayName =
      myRequest.keyword ||
      myRequest.dish?.name ||
      (myRequest.type === "ANY" ? "なんでもOK" : "決定済みのごはん");

    initialResult = {
      dish: {
        id: myRequest.dishId || myRequest.dish?.id || "",
        name: displayName,
        imageUrl: myRequest.dish?.imageUrl || null,
      },
      reason: "",
      isAiGeneration: false,
    };
  }

  // タグ名やメニュー名をリスト化してフォームへ渡す
  const suggestionDishNames = tags.map((t) => t.name);
  const availableDishesForExclusion = householdDishes.map((d) => d.name);

  return (
    <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center px-4 text-white font-sans select-none pb-20">
      <Header
        userName={userName}
        householdName={householdName}
        isOwner={isOwner}
      />

      <div className="w-full max-w-xl flex flex-col items-center mt-6">
        <h1 className="text-xl md:text-2xl font-black mb-6 tracking-wider">
          あなたの希望
        </h1>

        <div className="w-full bg-white rounded-3xl p-6 md:p-10 shadow-xl text-gray-800 text-center mb-6">
          <MyDishForm
            initialResult={initialResult}
            suggestionDishNames={suggestionDishNames}
            userId={user.id}
            // ▼ フォーム側で除外選択に使えるメニュー一覧を渡す（MyDishForm側の受け取りに対応させてください）
            availableDishes={availableDishesForExclusion}
          />
        </div>
      </div>
    </div>
  );
}
