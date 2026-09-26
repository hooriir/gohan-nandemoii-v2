"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Header from "@/components/Header";
import { createClient } from "@/utils/supabase/client";

interface Dish {
  id: string;
  name: string;
  imageUrl: string | null;
}

interface TodayLogData {
  id: number;
  dish: Dish;
  reason: string | null;
  createdAt: string;
}

function HomePageContent() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<"OWNER" | "MEMBER">("MEMBER");
  const [authChecking, setAuthChecking] = useState(true);

  const [todayDecided, setTodayDecided] = useState<TodayLogData | null>(null);
  const [checkingTodayLog, setCheckingTodayLog] = useState(true);

  const isLoggedIn = !!userId;

  // 1. ログイン認証チェック
  useEffect(() => {
    const supabase = createClient();

    async function checkInitialUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      setAuthChecking(false);
    }
    checkInitialUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
      setAuthChecking(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. 世帯チェック・本日決定ログの並列取得
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    async function loadData() {
      try {
        const [houseRes, logRes] = await Promise.all([
          fetch("/api/household/me"),
          fetch("/api/dish-show-log", { cache: "no-store" }),
        ]);

        if (!isMounted) return;

        // 世帯・役割チェック
        if (houseRes.ok) {
          const houseData = await houseRes.json();
          if (!houseData.hasHousehold) {
            router.push("/household/create");
            return;
          }
          setCurrentUserRole(houseData.role || "MEMBER");
        }

        // 決定ログチェック
        if (logRes.ok) {
          const logData = await logRes.json();
          if (logData.exists && logData.data) {
            setTodayDecided(logData.data);
          } else {
            setTodayDecided(null);
          }
        }
      } catch (err) {
        console.error("データの取得に失敗しました:", err);
      } finally {
        if (isMounted) setCheckingTodayLog(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [userId, router]);

  // 3. セッションタイムアウト処理
  const logoutUser = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login?reason=timeout");
  }, [router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(logoutUser, 30 * 60 * 1000);
    };

    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
    };
  }, [isLoggedIn, logoutUser]);

  // 代表者専用：決めなおす処理
  const handleReset = async () => {
    if (currentUserRole !== "OWNER") return;
    try {
      await fetch("/api/dish-show-log", {
        method: "DELETE",
      });
    } catch (e) {
      console.error("ログの削除に失敗しました:", e);
    } finally {
      setTodayDecided(null);
    }
  };

  if (authChecking || checkingTodayLog) {
    return (
      <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center justify-start p-4 text-white font-bold text-lg">
        <Header />
        <div className="mt-20 flex items-center gap-2">
          <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
          <span>読み込み中...</span>
        </div>
      </div>
    );
  }

  // 【パターン A】すでに本日の全体メニューが決定している場合
  if (todayDecided) {
    return (
      <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center px-4 text-white font-sans select-none pb-20">
        <Header />

        <div className="w-full max-w-xl flex flex-col items-center mt-6">
          <h1 className="text-xl md:text-2xl font-black mb-6 tracking-wider">
            今日のごはん
          </h1>

          <div className="w-full bg-white rounded-3xl p-6 md:p-8 shadow-xl text-gray-800 text-center mb-6">
            <div className="w-full h-56 md:h-64 rounded-2xl overflow-hidden mb-6 flex items-center justify-center bg-gray-50 relative">
              {todayDecided.dish?.imageUrl ? (
                <Image
                  src={todayDecided.dish.imageUrl}
                  alt={todayDecided.dish.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 500px"
                  className="object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <span className="text-6xl mb-2">🍚</span>
                </div>
              )}
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-gray-800 mb-6 tracking-wide">
              {todayDecided.dish?.name}
            </h2>

            {todayDecided.reason && (
              <div className="bg-[#53cbfb] text-white p-4 rounded-2xl text-left text-sm shadow-inner mb-2">
                <p className="font-bold text-xs uppercase tracking-wider mb-1">
                  AIごはんさん
                </p>
                <p className="leading-relaxed font-medium">
                  {todayDecided.reason}
                </p>
              </div>
            )}
          </div>

          {/* 代表者のみリセットボタンを表示 */}
          {currentUserRole === "OWNER" && (
            <button
              onClick={handleReset}
              className="w-full max-w-xs py-3 bg-white text-[#53cbfb] font-bold rounded-full shadow-md transition-all active:scale-95 text-sm"
            >
              やっぱり決めなおす
            </button>
          )}
        </div>
      </div>
    );
  }

  // 【パターン B】トップ画面（今日のごはん未決定時）
  return (
    <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center px-4 text-white font-sans select-none pb-20">
      <Header />

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
              />
            </div>
            <p className="text-gray-500 font-bold mb-8">
              今日のごはんはまだ決まっていません
            </p>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => router.push("/my-dish")}
                className="w-full py-3.5 bg-[#e60012] hover:bg-[#c4000f] text-white font-black rounded-full shadow-lg transition-transform active:scale-95 text-base"
              >
                あなたのごはんを決める
              </button>

              <button
                onClick={() => router.push("/family-summary")}
                className="w-full py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-full shadow-sm hover:bg-gray-50 transition-all text-sm"
              >
                みんなのごはんを見る
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center justify-start p-4 text-white font-bold text-lg">
          <Header />
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
