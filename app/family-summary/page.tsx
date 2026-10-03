import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import DeadlineMessageEditor from "@/components/family-summary/DeadlineMessageEditor";
import MediateButton from "@/components/family-summary/MediateButton";
import { getJstDayRange, getJstDateOnly } from "@/utils/date";

export const revalidate = 0;

export default async function FamilySummaryPage() {
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
    include: {
      household: true,
      user: { select: { name: true } },
    },
  });

  if (!member) {
    redirect("/household/create");
  }

  const householdId = member.householdId;
  const currentUserRole = member.role;

  // 2. 本日のJST範囲（start, end）と日付文字列（today）を取得
  const { start, end } = getJstDayRange();
  const today = getJstDateOnly();

  // 3. 本日の決定ログと世帯メンバーの本日希望を並列取得
  const [todayLog, householdMembers, todayRequests] = await Promise.all([
    prisma.dishShowLog.findFirst({
      where: {
        householdId,
        // ✅ createdAt を { gte: start, lte: end } に置き換え
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        dish: { select: { id: true, name: true, imageUrl: true } },
      },
      orderBy: { createdAt: "desc" },
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

  // 1人でもリクエスト（希望・NG・なんでも等）を入力しているかチェック
  const hasAnyRequest = membersRequests.some((m) => m.request !== null);

  const deadlineMessage =
    member.household.deadlineMessage || "午後4時までに決めてね";

  return (
    <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center px-4 text-white font-sans select-none pb-20">
      <Header />

      <div className="w-full max-w-xl flex flex-col items-center mt-6">
        <h1 className="text-2xl md:text-3xl font-black mb-6 tracking-wider text-white">
          みんなのごはん
        </h1>

        {/* 家族の希望一覧カード */}
        <div className="w-full bg-white rounded-3xl p-6 md:p-8 shadow-xl text-gray-800 mb-6">
          {/* メッセージ表示 & 編集エリア */}
          <DeadlineMessageEditor
            initialMessage={deadlineMessage}
            isOwner={currentUserRole === "OWNER"}
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
                        <a
                          href="/my-dish"
                          className="bg-[#54C7F3] hover:bg-[#3bbbe8] text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-transform active:scale-95 block text-center"
                        >
                          変更する
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 下部ステータス / 決定ボタンエリア */}
          {todayLog ? (
            /* 本日のごはんが決定済みの場合 */
            <div className="bg-sky-50 p-4 rounded-2xl text-center border border-sky-100">
              <p className="text-sm md:text-base font-black text-[#e60012] mb-1">
                「{todayLog.dish?.name}」に決定しています
              </p>
              <p className="text-xs text-gray-500 font-medium">
                決定メニューはホーム画面（トップ）からいつでも確認できます。
              </p>
            </div>
          ) : currentUserRole === "OWNER" ? (
            /* 未決定 且つ 代表者の場合 */
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
            /* 未決定 且つ メンバーの場合 */
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
