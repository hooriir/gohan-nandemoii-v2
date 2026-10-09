import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import { prisma } from "@/lib/prisma";
import ResetButton from "@/components/ResetButton";
import { getJstDayRange } from "@/utils/date";
import { getCurrentUserContext } from "@/lib/getCurrentUserContext";

export const revalidate = 0; // 常に最新データを取得

export default async function HomePage() {
  // 1. サーバー側で認証・世帯文脈を取得
  const userContext = await getCurrentUserContext();

  // 未ログインの場合はログイン画面へ
  if (!userContext || !userContext.user) {
    redirect("/login");
  }

  // 世帯未所属（householdIdが存在しない）場合は世帯作成へ
  if (!userContext.householdId) {
    redirect("/household/create");
  }

  // 2. 本日の決定ログを取得
  const { start, end } = getJstDayRange();

  const todayLog = await prisma.dishShowLog.findFirst({
    where: {
      householdId: userContext.householdId,
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      dish: {
        select: { id: true, name: true, imageUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const headerProps = {
    userName: userContext.userName,
    householdName: userContext.householdName,
    isOwner: userContext.isOwner,
  };

  // 【パターン A】本日のメニューが決定している場合
  if (todayLog) {
    return (
      <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center px-4 text-white font-sans select-none pb-20">
        <Header {...headerProps} />

        <div className="w-full max-w-xl flex flex-col items-center mt-6">
          <h1 className="text-xl md:text-2xl font-black mb-6 tracking-wider">
            今日のごはん
          </h1>

          <div className="w-full bg-white rounded-3xl p-6 md:p-8 shadow-xl text-gray-800 text-center mb-6">
            <div className="w-full h-56 md:h-64 rounded-2xl overflow-hidden mb-6 flex items-center justify-center bg-gray-50 relative">
              {todayLog.dish?.imageUrl ? (
                <Image
                  src={todayLog.dish.imageUrl}
                  alt={todayLog.dish.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 500px"
                  className="object-contain"
                  priority
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <span className="text-6xl mb-2">🍚</span>
                </div>
              )}
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-gray-800 mb-6 tracking-wide">
              {todayLog.dish?.name}
            </h2>

            {todayLog.keyword && (
              <div className="bg-[#53cbfb] text-white p-4 rounded-2xl text-left text-sm shadow-inner mb-2">
                <p className="font-bold text-xs tracking-wider mb-1">
                  AIごはんさん
                </p>
                <p className="leading-relaxed font-medium">
                  {todayLog.keyword}
                </p>
              </div>
            )}
          </div>

          {/* 代表者のみリセットボタン（Client Component） */}
          {userContext.isOwner && <ResetButton />}
        </div>
      </div>
    );
  }

  // 【パターン B】今日のごはん未決定時
  return (
    <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center px-4 text-white font-sans select-none pb-20">
      <Header {...headerProps} />

      <div className="w-full max-w-xl flex flex-col items-center mt-6">
        <h1 className="text-xl md:text-2xl font-black mb-6 tracking-wider">
          今日のごはん
        </h1>

        <div className="w-full bg-white rounded-3xl p-6 md:p-8 shadow-xl text-gray-800 text-center mb-6">
          <div className="flex flex-col items-center py-6">
            <div className="w-28 h-28 mb-4 relative flex items-center justify-center">
              <Image
                src="/images/chawan.svg"
                alt="今日のごはん"
                width={100}
                height={100}
                className="object-contain"
                priority
              />
            </div>
            <p className="text-gray-500 font-bold mb-8">
              今日のごはんはまだ決まっていません
            </p>

            <div className="w-full flex flex-col gap-3">
              <Link
                href="/my-dish?open=true"
                className="w-full py-3.5 bg-[#e60012] hover:bg-[#c4000f] text-white font-black rounded-full shadow-lg transition-transform active:scale-95 text-base text-center block"
              >
                あなたのごはんを決める
              </Link>

              <Link
                href="/family-summary"
                className="w-full py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-full shadow-sm hover:bg-gray-50 transition-all text-sm text-center block"
              >
                みんなのごはんを見る
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
