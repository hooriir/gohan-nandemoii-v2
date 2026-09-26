"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Header from "@/components/Header";
import { createClient } from "@/utils/supabase/client";

interface Dish {
  id: string;
  name: string;
  imageUrl: string | null;
}

interface RecommendResponse {
  dish: Dish;
  reason: string;
  isAiGeneration: boolean;
}

function MyDishContent() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // データ取得中のローディングステート
  const [fetchingData, setFetchingData] = useState(true);

  // 自分の希望・検索用ステート
  const [myRequestType] = useState<"WANT" | "NG" | "ANY">("WANT");
  const [dishNameInput, setDishNameInput] = useState("");
  const [suggestionDishNames, setSuggestionDishNames] = useState<string[]>([]);

  // 「ごはんを決める！」入力フォーム展開用ステート
  const [isSelecting, setIsSelecting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResponse | null>(null);

  // 認証チェック
  useEffect(() => {
    const supabase = createClient();

    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      setAuthChecking(false);
    }
    checkUser();
  }, []);

  // タグ（メニュー候補）・自分の本日希望取得
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    async function loadData() {
      try {
        setFetchingData(true);

        // メニュー一覧候補と本日の希望を並行取得
        const [tagRes, myReqRes] = await Promise.all([
          fetch("/api/tags"),
          fetch("/api/meal-requests/me"),
        ]);

        if (tagRes.ok && isMounted) {
          const tagData = await tagRes.json();
          setSuggestionDishNames(
            tagData.map((item: { name: string }) => item.name)
          );
        }

        if (myReqRes.ok && isMounted) {
          const resJson = await myReqRes.json();
          const reqData = resJson.request || resJson.data || resJson;

          if (reqData && (reqData.keyword || reqData.dishName || reqData.dish || reqData.type)) {
            // キーワード・要望テキストを最優先で取得
            const displayName =
              reqData.keyword ||
              reqData.dishName ||
              reqData.dish?.name ||
              (reqData.type === "ANY" ? "なんでもOK" : "決定済みのごはん");

            const displayImage =
              reqData.dish?.imageUrl || reqData.imageUrl || null;

            setResult({
              dish: {
                id: reqData.dishId || reqData.dish?.id || "",
                name: displayName,
                imageUrl: displayImage,
              },
              reason: "",
              isAiGeneration: false,
            });
          }
        }
      } catch (err) {
        console.error("データの取得に失敗しました:", err);
      } finally {
        if (isMounted) {
          setFetchingData(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  // 決定・検索ロジック
  const handleSearch = useCallback(
    async (selectedDishName: string) => {
      if (!userId) return;

      const cleanName = selectedDishName.trim() || "なんでもいい";
      setDishNameInput(cleanName);
      setLoading(true);

      try {
        // 希望保存（※AI推薦APIは呼ばず、入力したキーワードをそのままセット）
        const res = await fetch("/api/meal-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: myRequestType,
            keyword: cleanName,
          }),
        });

        if (res.ok) {
          setResult({
            dish: {
              id: "",
              name: cleanName,
              imageUrl: null,
            },
            reason: "",
            isAiGeneration: false,
          });
          setIsSelecting(false);
        } else {
          alert("希望の保存に失敗しました。");
        }
      } catch (err) {
        console.error("エラーが発生しました:", err);
      } finally {
        setLoading(false);
      }
    },
    [userId, myRequestType]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(dishNameInput);
  };

  if (authChecking || fetchingData) {
    return (
      <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center justify-start p-4 text-white font-bold text-lg">
        <Header />
        <div className="mt-20">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center px-4 text-white font-sans select-none pb-20">
      <Header />

      <div className="w-full max-w-xl flex flex-col items-center mt-6">
        <h1 className="text-xl md:text-2xl font-black mb-6 tracking-wider">
          あなたのごはん
        </h1>

        <div className="w-full bg-white rounded-3xl p-6 md:p-10 shadow-xl text-gray-800 text-center mb-6">
          {/* 【1】決定済み・結果表示画面 */}
          {result && !isSelecting ? (
            <div className="flex flex-col items-center">

              {/* メニュー画像 */}
              <div className="w-full h-48 md:h-56 rounded-2xl overflow-hidden mb-4 flex items-center justify-center bg-gray-50 relative border border-gray-100">
                <div className="w-28 h-28 relative flex items-center justify-center">
                  <Image
                    src="/images/tubu.svg"
                    alt="イラスト"
                    width={100}
                    height={100}
                    className="object-contain"
                  />
                </div>
              </div>

              {/* メニュー名（キーワード） */}
              <h2 className="text-2xl md:text-3xl font-black text-gray-800 mb-8 tracking-wide">
                {result.dish.name}
              </h2>

              <div className="w-full max-w-sm flex flex-col gap-3">
                <button
                  onClick={() => router.push("/family-summary")}
                  className="w-full py-3 bg-[#e60012] hover:bg-[#c4000f] text-white font-black rounded-full shadow-md transition-all active:scale-95 text-sm"
                >
                  みんなのごはんを見る
                </button>

                <button
                  onClick={() => setIsSelecting(true)}
                  className="w-full py-2.5 bg-[#53cbfb] hover:bg-sky-400 text-white font-bold rounded-full transition-all text-sm"
                >
                  メニューを変更する
                </button>
              </div>
            </div>
          ) : !isSelecting ? (
            /* 【2】未決定（初期画面） */
            <div className="flex flex-col items-center py-4">
              <div className="w-24 h-24 mb-4 relative flex items-center justify-center">
                <Image
                  src="/images/chawan.svg"
                  alt="決まってないよ"
                  width={90}
                  height={90}
                  className="object-contain"
                />
              </div>
              <p className="text-gray-500 font-bold mb-8 text-sm">
                決まってないよ
              </p>

              <div className="w-full max-w-sm flex flex-col items-center gap-3">
                <button
                  onClick={() => setIsSelecting(true)}
                  className="w-full py-3.5 bg-[#e60012] hover:bg-[#c4000f] text-white font-black rounded-full shadow-md transition-transform active:scale-95 text-base tracking-wide"
                >
                  ごはんを決める！
                </button>

                <button
                  onClick={() => router.push("/family-summary")}
                  className="w-full py-2.5 bg-white border-2 border-[#53cbfb] text-[#53cbfb] font-bold rounded-full hover:bg-sky-50 transition-all text-sm"
                >
                  みんなのごはんを見る
                </button>
              </div>
            </div>
          ) : (
            /* 【3】「ごはんを決める！」「変更する」押下時：メニュー名入力フォーム */
            <div className="py-2">
              <h2 className="text-lg font-black text-gray-700 mb-4">
                キーワードを入力
              </h2>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="キーワードを入力（例：さっぱり、カレーなど）"
                    value={dishNameInput}
                    onChange={(e) => setDishNameInput(e.target.value)}
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#53cbfb] font-bold text-sm"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-[#e60012] hover:bg-[#c4000f] text-white font-black rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 text-sm"
                  >
                    {loading ? "決定中..." : "これ！"}
                  </button>
                </div>

                {/* メニュー名のタグ候補一覧 */}
                {suggestionDishNames.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center max-h-36 overflow-y-auto p-1">
                    {suggestionDishNames.map((item, index) => (
                      <button
                        key={index}
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setDishNameInput(item);
                          handleSearch(item);
                        }}
                        className="bg-sky-100 text-[#53cbfb] hover:bg-sky-200 text-xs font-bold px-3 py-1.5 rounded-full transition-all active:scale-95"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </form>

              <button
                onClick={() => setIsSelecting(false)}
                className="mt-6 text-xs text-gray-400 font-bold underline"
              >
                キャンセル
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyDishPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center justify-start p-4 text-white font-bold text-lg">
          <Header />
        </div>
      }
    >
      <MyDishContent />
    </Suspense>
  );
}
