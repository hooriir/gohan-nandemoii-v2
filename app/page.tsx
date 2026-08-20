"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [suggestionKeywords, setSuggestionKeywords] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const isLoggedIn = !!userId;

  useEffect(() => {
    if (!userId) return;

    async function fetchSuggestions() {
      try {
        const response = await fetch("/api/tags");
        if (response.ok) {
          const data = await response.json();
          const names = data.map((item: { name: string }) => item.name);
          setSuggestionKeywords(names);
        }
      } catch (err) {
        console.error("候補の取得に失敗しました:", err);
      }
    }

    fetchSuggestions();
  }, [userId]);

  useEffect(() => {
    const supabase = createClient();

    async function checkInitialUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUserId(session?.user?.id || null);
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setAuthChecking(false);
      }
    }
    checkInitialUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
      setAuthChecking(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => {
        setIsPopupOpen(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [result]);

  useEffect(() => {
    if (!isLoggedIn) return;

    let timeoutId: NodeJS.Timeout;

    const logoutUser = async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login?reason=timeout");
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(logoutUser, 30 * 60 * 1000);
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
    };
  }, [isLoggedIn, router]);



  const handleSearch = useCallback(async (searchKeyword: string) => {
    if (!userId) return;

    const cleanKeyword = searchKeyword.trim() || "なんでもいい";
    setKeyword(cleanKeyword);
    setHasSearched(true);
    setLoading(true);
    setError(null);
    setResult(null);
    setIsPopupOpen(false);

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keyword: cleanKeyword,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "メニューの決定に失敗しました。");
      }

      const data: RecommendResponse = await response.json();
      setResult(data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "予期せぬエラーが発生しました。";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const queryKeyword = searchParams.get("keyword");
    if (queryKeyword !== null && userId) {
      const timer = setTimeout(() => {
        handleSearch(queryKeyword);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams, handleSearch, userId]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(keyword);
  };

  if (authChecking) {
    return (
      <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center justify-start p-4 text-white font-bold text-lg">
        <Header />
      </div>
    );
  }


  // ==========================================
  // ログイン中の通常画面
  // ==========================================
  return (
    <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center justify-center px-4 text-white font-sans select-none justify-start pb-20">
      <Header />

      {!hasSearched ? (
        <div className="w-full max-w-xl text-center py-12 flex flex-col items-center">
          <p className="text-2xl font-black mb-8 tracking-wider">今日のごはんは．．．？</p>

          <form onSubmit={onSubmit} className="w-full px-2 flex flex-col gap-4">
            <input
              type="text"
              placeholder="さっぱり、こってり、なんでもいい..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full px-4 py-4 rounded-2xl text-gray-800 bg-white shadow-md focus:outline-none text-center text-lg font-bold placeholder-gray-400"
            />

            {/* 登録されているタグ・メニューのピル型ボタン一覧 */}
            {suggestionKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto p-1">
                {suggestionKeywords.map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setKeyword(item);
                      // ※もしボタンを押した瞬間にそのまま検索まで実行したい場合は、
                      // 下のコメントアウトを外して handleSearch(item); を呼ぶこともできます！
                      // handleSearch(item);
                    }}
                    className="bg-white/20 hover:bg-white/30 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/40 transition-all shadow-sm"
                  >
                    #{item}
                  </button>
                ))}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-[#e60012] hover:bg-[#c4000f] text-white font-black text-xl rounded-2xl shadow-lg transition-transform active:scale-95"
            >
              これに決めた！
            </button>
          </form>
        </div>
      ) : (
        <div className="w-full max-w-xl flex flex-col items-center">
          <p className="text-xl md:text-2xl font-black mb-4 tracking-wider drop-shadow-sm">
            今日のごはんは...？
          </p>

          <div className="w-full bg-white rounded-3xl p-6 shadow-xl text-gray-800 text-center mb-6 border border-white/50">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#53cbfb] mb-4"></div>
                <p className="text-gray-500 font-bold">
                  {keyword === "なんでもいい"
                    ? "AIシェフが今日の気分を分析中..."
                    : `「${keyword}」から最高の1品を選び中...`}
                </p>
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <p className="text-red-500 font-bold mb-4">エラーが発生しました</p>
                <p className="text-sm text-gray-600 mb-6">{error}</p>
                <button
                  onClick={() => handleSearch(keyword)}
                  className="px-6 py-2 bg-[#53cbfb] text-white rounded-full font-bold shadow hover:bg-[#42b7e6]"
                >
                  もう一度試す
                </button>
              </div>
            ) : result ? (
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-[#54C7F3] mb-4 tracking-wide">
                  {result.dish.name}
                </h2>

                <div className="w-full h-56 md:h-64 rounded-2xl overflow-hidden mb-6 flex items-center justify-center bg-gray-50 border border-gray-100 relative">
                  {result.dish.imageUrl ? (
                    <Image
                      src={result.dish.imageUrl}
                      alt={result.dish.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 500px"
                      className="object-contain"
                    />
              ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <span className="text-6xl mb-2">
                        <Image
                          src="/images/chawan.svg"
                          alt="茶碗"
                          width={80}
                          height={46}
                        />
                      </span>
                      <span className="text-xs">画像なくてもわかるよね</span>
                    </div>
                  )}
                </div>

                {result.reason && (
                  <div className="bg-[#54C7F3] border border-[#eeeeee] text-[#ffffff] p-4 rounded-xl text-left text-sm flex items-start gap-3 shadow-inner">
                    <span className="text-2xl mt-0.5">
                      <Image
                        src="/images/gohan.svg"
                        alt="ごはん"
                        width={40}
                        height={31}
                      />
                    </span>
                    <div>
                      <p className="font-bold text-[11px] text-[#ffffff] uppercase tracking-wider mb-0.5">
                        {result.isAiGeneration ? "AIごはんさんより" : "ごはんさんより"}
                      </p>
                      <p className="leading-relaxed font-semibold">
                        {result.reason}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="w-full text-center mb-8 px-2 flex flex-col gap-3">
            <button
              onClick={() => setIsPopupOpen(true)}
              className="w-full py-4 bg-[#e60012] hover:bg-[#c4000f] text-white font-black text-xl rounded-2xl shadow-lg transition-transform active:scale-95"
            >
              もう一回やる
            </button>

            <button
              onClick={() => {
                setHasSearched(false);
                setKeyword("");
                setResult(null);
              }}
              className="text-sm font-bold underline hover:text-white/80 mt-2"
            >
              トップ（検索前）に戻る
            </button>
          </div>
        </div>
      )}

      {isPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 shadow-2xl text-gray-800 animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-700 tracking-wider">
                もう一回やる？
              </h3>
              <button
                onClick={() => setIsPopupOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="ラストチャンス！気分を入力..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl text-gray-800 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#53cbfb] placeholder-gray-400 font-bold"
              />

              {/* ポップアップ内：登録されているタグ・メニューのピル型ボタン一覧 */}
              {suggestionKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center max-h-28 overflow-y-auto p-1 bg-gray-50/50 rounded-xl border border-gray-100">
                  {suggestionKeywords.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setKeyword(item);
                        // もしここでもボタンを押した瞬間にそのまま検索させたい場合は、
                        // handleSearch(item); をここに入れることも可能です！
                      }}
                      className="bg-white hover:bg-slate-100 active:scale-95 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full border border-gray-200 transition-all shadow-xs disabled:opacity-50"
                    >
                      #{item}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#e60012] hover:bg-[#c4000f] disabled:bg-gray-400 text-white font-black rounded-xl shadow-md transition-all active:scale-95"
              >
                これだ！
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center justify-start p-4 text-white font-bold text-lg">
        <Header />
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
