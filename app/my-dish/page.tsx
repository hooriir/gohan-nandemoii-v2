import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import MyDishForm from "@/components/my-dish/MyDishForm";

function getTodayJst(): Date {
  const now = new Date();
  const jstString = now.toLocaleDateString("en-US", { timeZone: "Asia/Tokyo" });
  return new Date(`${jstString} 00:00:00`);
}

export const revalidate = 0;

export default async function MyDishPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. 自分の所属世帯を取得
  const member = await prisma.householdMember.findFirst({
    where: { userId: user.id },
  });

  if (!member) {
    redirect("/household/create");
  }

  const householdId = member.householdId;
  const today = getTodayJst();

  // 2. 本日の自分の希望リクエスト と 世帯のタグ（キーワード候補）を並列取得
  const [myRequest, tags] = await Promise.all([
    prisma.mealRequest.findFirst({
      where: {
        householdId,
        userId: user.id,
        createdAt: { gte: today },
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
  ]);

  // 初期表示用のリクエスト情報を整形
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

  const suggestionDishNames = tags.map((t) => t.name);

  return (
    <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center px-4 text-white font-sans select-none pb-20">
      <Header />

      <div className="w-full max-w-xl flex flex-col items-center mt-6">
        <h1 className="text-xl md:text-2xl font-black mb-6 tracking-wider">
          あなたのごはん
        </h1>

        <div className="w-full bg-white rounded-3xl p-6 md:p-10 shadow-xl text-gray-800 text-center mb-6">
          <MyDishForm
            initialResult={initialResult}
            suggestionDishNames={suggestionDishNames}
            userId={user.id}
          />
        </div>
      </div>
    </div>
  );
}
