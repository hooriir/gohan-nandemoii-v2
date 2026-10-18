import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import { prisma } from "@/lib/prisma";
import ResetButton from "@/components/ResetButton";
import DeadlineMessageEditor from "@/components/family-summary/DeadlineMessageEditor";
import MediateButton from "@/components/family-summary/MediateButton";
import { getJstDayRange, getJstDateOnly } from "@/utils/date";
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

  const { user, isOwner, userName, householdName, householdId } = userContext;

  // 2. 本日の決定ログを取得
  const { start, end } = getJstDayRange();

  const todayLog = await prisma.dishShowLog.findFirst({
    where: {
      householdId,
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
    userName,
    householdName,
    isOwner,
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
          {isOwner && <ResetButton />}
        </div>
      </div>
    );
  }

  // 【パターン B】今日のごはん未決定時：「みんなの希望」のレイアウトをそのままホームに表示
  const today = getJstDateOnly();

  const [household, householdMembers, todayRequests] = await Promise.all([
    prisma.household.findUnique({
      where: { id: householdId },
      select: { deadlineMessage: true },
    }),
    prisma.householdMember.findMany({
      where: { householdId },
      include: {
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.mealRequest.findMany({
      where: {
        householdId,
        requestDate: today,
      },
      include: {
        dish: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // メンバーごとの最新リクエストをマッピング
  const memberRequestMap = new Map<string, (typeof todayRequests)[0]>();
  for (const req of todayRequests) {
    if (!memberRequestMap.has(req.userId)) {
      memberRequestMap.set(req.userId, req);
    }
  }

  const membersRequests = householdMembers.map((m) => {
    const req = memberRequestMap.get(m.userId);
    return {
      userId: m.userId,
      userName: m.user.name || "メンバー",
      role: m.role,
      request: req
        ? {
            type: req.type as "WANT" | "NG" | "ANY",
            keyword: req.keyword,
            dishName: req.dish?.name || null,
          }
        : null,
    };
  });

  const hasAnyRequest = membersRequests.some((m) => m.request !== null);
  const deadlineMessage =
    household?.deadlineMessage || "午後4時までに決めてね";

  return (
    <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center px-4 text-white font-sans select-none pb-20">
      <Header {...headerProps} />

      <div className="w-full max-w-xl flex flex-col items-center mt-6">
        <h1 className="text-2xl md:text-3xl font-black mb-6 tracking-wider text-white">
          みんなの希望
        </h1>

        {/* 家族の希望一覧カード */}
        <div className="w-full bg-white rounded-3xl p-6 md:p-8 shadow-xl text-gray-800 mb-6">
          {/* メッセージ表示 & 編集エリア */}
          <DeadlineMessageEditor
            initialMessage={deadlineMessage}
            isOwner={isOwner}
          />

          <div className="space-y-4 mb-8">
            {membersRequests.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                まだ誰も希望を入力していません
              </p>
            ) : (
              membersRequests.map((m) => {
                const isMe = m.userId === user.id;
                const requestText =
                  m.request?.keyword ||
                  m.request?.dishName ||
                  (m.request?.type === "ANY" ? "なんでもOK" : null);

                return (
                  <div
                    key={m.userId}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 min-h-[64px]"
                  >
                    {/* 名前 */}
                    <div className="w-1/4 font-bold text-gray-700 text-sm md:text-base">
                      {m.userName}
                    </div>

                    {/* 選択された要望・テキスト */}
                    <div className="flex-1 text-center font-black text-sm md:text-base px-2">
                      {requestText ? (
                        <span
                          className={
                            m.request?.type === "NG"
                              ? "text-gray-400 line-through"
                              : "text-[#e60012]"
                          }
                        >
                          {requestText}
                        </span>
                      ) : (
                        <span className="text-sky-400 font-bold">
                          決まってない
                        </span>
                      )}
                    </div>

                    {/* 変更ボタン（自分の行のみ表示） */}
                    <div className="w-1/4 flex justify-end">
                      {isMe && (
                        <Link
                          href="/my-dish?open=true"
                          className="bg-[#54C7F3] hover:bg-[#3bbbe8] text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-transform active:scale-95 block text-center"
                        >
                          変更する
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 下部ステータス / 決定ボタンエリア（ここでは未決定なのが確定しているため条件分岐を整理） */}
          {isOwner ? (
            hasAnyRequest ? (
              <MediateButton />
            ) : (
              <div className="bg-amber-50 p-4 rounded-2xl text-center border border-amber-100">
                <p className="text-sm font-bold text-amber-700 mb-1">
                  希望が入力されていません
                </p>
                <p className="text-xs text-amber-600">
                  誰か一人以上が希望を入力すると、AI調停を実行できます。
                </p>
              </div>
            )
          ) : (
            <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
              <p className="text-sm font-bold text-gray-600 mb-1">
                代表者の決定待ちです
              </p>
              <p className="text-xs text-gray-400">
                代表者がメニューを確定すると、ホーム画面に表示されます。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
