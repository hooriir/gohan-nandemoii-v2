"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/utils/supabase/client";

interface MemberRequest {
  userId: string;
  userName: string;
  role: "OWNER" | "MEMBER";
  request: {
    type: "WANT" | "NG" | "ANY";
    keyword: string | null;
    dishName: string | null;
  } | null;
}

interface DecidedDish {
  id?: string;
  name: string;
  imageUrl?: string | null;
  reason?: string;
}

export default function FamilySummaryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<"OWNER" | "MEMBER">("MEMBER");
  const [membersRequests, setMembersRequests] = useState<MemberRequest[]>([]);

  // 締め切り・案内メッセージ用ステート
  const [deadlineMessage, setDeadlineMessage] = useState("午後4時までに決めてね");
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [tempMessage, setTempMessage] = useState("");
  const [isSavingMessage, setIsSavingMessage] = useState(false);

  // 代表者がAI調整・決定を実行中のフラグ & 決定結果
  const [isMediating, setIsMediating] = useState(false);
  const [decidedResult, setDecidedResult] = useState<DecidedDish | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 家族の希望一覧と自分の権限を取得
  useEffect(() => {
    let isMounted = true;

    async function loadFamilySummary() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (isMounted && user) {
          setCurrentUserId(user.id);
        }

        // 1. 自分の世帯情報・役割（Role）・案内メッセージを取得
        const meRes = await fetch("/api/household/me");
        if (!meRes.ok) throw new Error("世帯情報の取得に失敗しました。");
        const meData = await meRes.json();

        if (isMounted) {
          setCurrentUserRole(meData.role || "MEMBER");
          if (meData.deadlineMessage) {
            setDeadlineMessage(meData.deadlineMessage);
          }
        }

        // 2. 本日の決定ログがあるか確認
        const todayLogRes = await fetch("/api/dish-show-log/today");
        if (todayLogRes.ok) {
          const todayLogData = await todayLogRes.json();
          if (isMounted && todayLogData.decided && todayLogData.dish) {
            setDecidedResult(todayLogData.dish);
          }
        }

        // 3. 家族全員の希望一覧を取得
        const requestsRes = await fetch("/api/meal-requests");
        if (requestsRes.ok) {
          const reqData = await requestsRes.json();
          if (isMounted) {
            setMembersRequests(reqData.members || []);
          }
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("データの読み込みに失敗しました。");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadFamilySummary();

    return () => {
      isMounted = false;
    };
  }, []);

  // 代表者によるメッセージ保存処理
  const handleSaveMessage = async () => {
    if (!tempMessage.trim()) return;
    setIsSavingMessage(true);
    try {
      const res = await fetch("/api/household/message", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: tempMessage.trim() }),
      });

      if (res.ok) {
        setDeadlineMessage(tempMessage.trim());
        setIsEditingMessage(false);
      } else {
        alert("メッセージの更新に失敗しました。");
      }
    } catch (err) {
      console.error(err);
      alert("通信エラーが発生しました。");
    } finally {
      setIsSavingMessage(false);
    }
  };

  // 【代表者専用】家族みんなの希望をまとめてAIで最終決定し、DBに保存してTOPへ遷移する
  const handleMediateAndDecide = async () => {
    if (currentUserRole !== "OWNER") return;

    setIsMediating(true);
    setError(null);

    try {
      // 1. AI調整・選定を実行
      const response = await fetch("/api/recommend/mediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "メニューの決定に失敗しました。");
      }

      const data = await response.json();
      const decidedDishName = data.dish?.name || data.dishName || "今日のごはん";
      const decidedDishId = data.dish?.id || data.dishId || null;
      const decidedReason = data.reason || "家族みんなの希望から決定しました！";

      // 2. 本日の世帯の決定ログ（DishShowLog）として保存する
      const saveLogRes = await fetch("/api/dish-show-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dishId: decidedDishId,
          dishName: decidedDishName,
          reason: decidedReason,
        }),
      });

      if (!saveLogRes.ok) {
        const logErrData = await saveLogRes.json();
        throw new Error(logErrData.error || "本日の決定ログの保存に失敗しました。");
      }

      // 3. キャッシュを更新してTOPページ（今日のごはん）へリダイレクト
      router.refresh();
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "予期せぬエラーが発生しました。";
      setError(msg);
    } finally {
      setIsMediating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center justify-start p-4 text-white font-bold">
        <Header />
        <div className="mt-20">読み込み中...</div>
      </div>
    );
  }

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
          <div className="mb-6 flex items-center justify-center min-h-[32px]">
            {isEditingMessage ? (
              <div className="flex items-center gap-2 w-full max-w-xs">
                <input
                  type="text"
                  value={tempMessage}
                  onChange={(e) => setTempMessage(e.target.value)}
                  placeholder="例：午後5時までに決めてね"
                  className="flex-1 px-3 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#53cbfb] font-bold text-gray-700"
                />
                <button
                  onClick={handleSaveMessage}
                  disabled={isSavingMessage}
                  className="bg-[#e60012] hover:bg-[#c4000f] text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow transition-all active:scale-95"
                >
                  保存
                </button>
                <button
                  onClick={() => setIsEditingMessage(false)}
                  className="text-gray-400 hover:text-gray-600 text-xs font-bold px-1"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-gray-400 text-center">
                  {deadlineMessage}
                </p>
                {currentUserRole === "OWNER" && (
                  <button
                    onClick={() => {
                      setTempMessage(deadlineMessage);
                      setIsEditingMessage(true);
                    }}
                    className="text-[10px] text-[#53cbfb] hover:underline font-bold bg-sky-50 px-1.5 py-0.5 rounded transition-all"
                  >
                    編集
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-600 text-xs font-bold rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-4 mb-8">
            {membersRequests.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                まだ誰も希望を入力していません
              </p>
            ) : (
              membersRequests.map((member) => {
                const isMe = member.userId === currentUserId;

                // メンバーが指定したキーワード／要望テキストを優先して表示する
                const requestText =
                  member.request?.keyword ||
                  member.request?.dishName ||
                  (member.request?.type === "ANY" ? "なんでもOK" : null);

                return (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 min-h-[64px]"
                  >
                    {/* 名前 */}
                    <div className="w-1/4 font-bold text-gray-700 text-sm md:text-base">
                      {member.userName || "メンバー"}
                    </div>

                    {/* 選択された要望・テキスト */}
                    <div className="flex-1 text-center font-black text-sm md:text-base px-2">
                      {requestText ? (
                        <span className={member.request?.type === "NG" ? "text-gray-400 line-through" : "text-[#e60012]"}>
                          {requestText}
                        </span>
                      ) : (
                        <span className="text-sky-400 font-bold">決まってない</span>
                      )}
                    </div>

                    {/* 変更ボタン（自分の行のみ表示） */}
                    <div className="w-1/4 flex justify-end">
                      {isMe && (
                        <button
                          onClick={() => router.push("/my-dish")}
                          className="bg-[#54C7F3] hover:bg-[#3bbbe8] text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-transform active:scale-95"
                        >
                          変更する
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 下部ステータス / 決定ボタンエリア */}
          {decidedResult ? (
            /* 本日のごはんが決定済みの場合 */
            <div className="bg-sky-50 p-4 rounded-2xl text-center border border-sky-100">
              <p className="text-sm md:text-base font-black text-[#e60012] mb-1">
                🎉 「{decidedResult.name}」に決定しています
              </p>
              <p className="text-xs text-gray-500 font-medium">
                決定メニューはホーム画面（トップ）からいつでも確認できます。
              </p>
            </div>
          ) : currentUserRole === "OWNER" ? (
            /* 未決定 且つ 代表者の場合 */
            <button
              onClick={handleMediateAndDecide}
              disabled={isMediating}
              className="w-full py-3.5 bg-[#e60012] hover:bg-[#c4000f] disabled:bg-gray-300 text-white font-black rounded-xl shadow-md transition-transform active:scale-95 text-base md:text-lg"
            >
              {isMediating ? "AIが調整中..." : "今日のごはんを決定する！"}
            </button>
          ) : (
            /* 未決定 且つ メンバーの場合 */
            <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
              <p className="text-sm font-bold text-gray-600 mb-1">
                ⏳ 代表者の決定待ちです
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
