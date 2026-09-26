"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/utils/supabase/client";
import { usePathname } from "next/navigation";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

function useIsMounted() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function Header() {
  const [userName, setUserName] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // モバイルメニュー開閉状態
  const mounted = useIsMounted();

  const pathname = usePathname();
  const isCenteredMode = pathname === "/" && !userName;

  // メニューを閉じる関数
  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const supabase = createClient();

    async function checkUserAndHousehold() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const name = session.user.user_metadata?.name || session.user.email?.split("@")[0] || "ユーザー";
          setUserName(name);
          setIsAuthChecking(false);

          fetch("/api/household/me")
            .then(async (res) => {
              if (res.ok) {
                const data = await res.json();
                if (data.hasHousehold && (data.household?.name || data.householdName)) {
                  setHouseholdName(data.household?.name || data.householdName);
                  setIsOwner(!!data.isOwner);
                }
              }
            })
            .catch((householdErr) => {
              console.error("世帯情報の取得エラー:", householdErr);
            });

        } else {
          setUserName(null);
          setHouseholdName(null);
          setIsOwner(false);
          setIsAuthChecking(false);
        }
      } catch (error) {
        console.error("ユーザー情報の取得エラー:", error);
        setIsAuthChecking(false);
      }
    }
    checkUserAndHousehold();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const name = session.user.user_metadata?.name || session.user.email?.split("@")[0] || "ユーザー";
        setUserName(name);
        setIsAuthChecking(false);

        fetch("/api/household/me")
          .then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              if (data.hasHousehold && (data.household?.name || data.householdName)) {
                setHouseholdName(data.household?.name || data.householdName);
                setIsOwner(!!data.isOwner);
              }
            }
          })
          .catch((householdErr) => {
            console.error("世帯情報の取得エラー:", householdErr);
          });
      } else {
        setUserName(null);
        setHouseholdName(null);
        setIsOwner(false);
        setIsAuthChecking(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUserName(null);
      setHouseholdName(null);
      setIsOwner(false);
      setIsMenuOpen(false);
      window.location.href = "/";
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  const isLoggedIn = !!userName;

  const displayName = isLoggedIn
    ? householdName
      ? `${householdName} ${userName}さん`
      : `${userName}さん`
    : "ゲストさん";

  return (
    <header className={`w-full max-w-[1000px] flex flex-col relative px-4 select-none ${
      isCenteredMode ? "items-center justify-center min-h-[75vh]" : "items-center mb-6 mt-4"
    }`}>

      <div className={`flex w-full items-center justify-between ${
        isCenteredMode ? "flex-col justify-center" : "flex-row"
      }`}>

        {/* 左側：ロゴ・ユーザー名エリア */}
        <div className={`flex flex-col shrink-0 ${
          isCenteredMode ? "justify-center text-center items-center" : "items-start text-left"
        }`}>
          <p className="text-white text-sm md:text-base font-bold tracking-wider mb-1 drop-shadow-sm min-h-[1.5rem]">
            {mounted && !isAuthChecking && `${displayName}の`}
          </p>
          <Link href="/" prefetch={false}>
            <Image
              src="/images/title.svg"
              alt="ごはん？なんでもいい～"
              width={400}
              height={125}
              style={{ width: "200px", height: "auto" }}
              className="md:w-[240px] transform hover:scale-105 transition-transform duration-200"
              priority
            />
          </Link>
        </div>

        {/* 右側：PC表示時の横並びボタンエリア (md以上で表示) */}
        <div className="hidden md:flex items-center justify-center shrink-0 min-h-[85px]">
          {!mounted || isAuthChecking ? (
            <div className="w-[200px] h-[80px]" />
          ) : isLoggedIn ? (
            <div className="flex items-center gap-2.5">
              <Link href="/" prefetch={false} className="group bg-white rounded-2xl p-2 w-20 h-20 flex flex-col items-center justify-center shadow-md hover:scale-105 transition-transform duration-200 shrink-0">
                <div className="w-8 h-8 mb-1 flex items-center justify-center">
                  <Image src="/images/tubu.svg" width={100} height={165} alt="今日のごはん" className="object-contain w-full h-full" priority />
                </div>
                <span className="text-gray-700 font-bold text-[10px] group-hover:text-brand-red transition-colors duration-200 text-center leading-tight">今日のごはん</span>
              </Link>

              <Link href="/family-summary" prefetch={false} className="group bg-white rounded-2xl p-2 w-20 h-20 flex flex-col items-center justify-center shadow-md hover:scale-105 transition-transform duration-200 shrink-0">
                <div className="w-8 h-8 mb-1 flex items-center justify-center">
                  <Image src="/images/ie.svg" width={100} height={100} alt="みんなのごはん" className="object-contain w-full h-full" priority />
                </div>
                <span className="text-gray-700 font-bold text-[10px] group-hover:text-brand-red transition-colors duration-200 text-center leading-tight">みんなのごはん</span>
              </Link>

              <Link href="/mypage/profile" prefetch={false} className="group bg-white rounded-2xl p-2 w-20 h-20 flex flex-col items-center justify-center shadow-md hover:scale-105 transition-transform duration-200 shrink-0">
                <div className="w-8 h-8 mb-1 flex items-center justify-center">
                  <Image src="/images/ume.svg" width={84} height={74} alt="プロフィール" className="object-contain w-full h-full" priority />
                </div>
                <span className="text-gray-700 font-bold text-[10px] group-hover:text-brand-red transition-colors duration-200 text-center leading-tight">プロフィール</span>
              </Link>

              {isOwner && (
                <Link href="/menus" prefetch={false} className="group bg-white rounded-2xl p-2 w-20 h-20 flex flex-col items-center justify-center shadow-md hover:scale-105 transition-transform duration-200 shrink-0">
                  <div className="w-8 h-8 mb-1 flex items-center justify-center">
                    <Image src="/images/chawan.svg" width={130} height={74} alt="ごはん登録" className="object-contain w-full h-full" priority />
                  </div>
                  <span className="text-gray-700 font-bold text-[10px] group-hover:text-brand-red transition-colors duration-200 text-center leading-tight">ごはん登録</span>
                </Link>
              )}

              {isOwner && (
                <Link href="/history" prefetch={false} className="group bg-white rounded-2xl p-2 w-20 h-20 flex flex-col items-center justify-center shadow-md hover:scale-105 transition-transform duration-200 shrink-0">
                  <div className="w-8 h-8 mb-1 flex items-center justify-center">
                    <Image src="/images/tokei.svg" width={100} height={165} alt="提案履歴" className="object-contain w-full h-full" priority />
                  </div>
                  <span className="text-gray-700 font-bold text-[10px] group-hover:text-brand-red transition-colors duration-200 text-center leading-tight">提案履歴</span>
                </Link>
              )}

              <button type="button" className="group bg-[#54C7F3] border-2 border-white rounded-2xl p-2 w-20 h-20 flex flex-col items-center justify-center shadow-md hover:scale-105 transition-transform duration-200 shrink-0 cursor-pointer" onClick={handleSignOut}>
                <div className="w-8 h-8 mb-1 flex items-center justify-center">
                  <Image src="/images/hashi.svg" alt="ログアウト" width={140} height={32} className="object-contain w-full h-full" priority />
                </div>
                <span className="text-white font-bold text-[10px] group-hover:opacity-90 transition-opacity duration-200 text-center leading-tight">ログアウト</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/register" prefetch={false} className="group bg-white rounded-2xl p-2 w-20 h-20 flex flex-col items-center justify-center shadow-md hover:scale-105 transition-transform duration-200 shrink-0">
                <div className="w-9 h-9 mb-1 flex items-center justify-center">
                  <Image src="/images/chawan.svg" width={130} height={74} alt="新規登録" className="object-contain w-full h-full" priority />
                </div>
                <span className="text-gray-700 font-bold text-[10px] group-hover:text-brand-red transition-colors duration-200 text-center leading-tight">新規登録</span>
              </Link>
              <Link href="/login" prefetch={false} className="group bg-[#54C7F3] border-2 border-white rounded-2xl p-2 w-20 h-20 flex flex-col items-center justify-center shadow-md hover:scale-105 transition-transform duration-200 shrink-0">
                <div className="w-9 h-9 mb-1 flex items-center justify-center">
                  <Image src="/images/hashi.svg" alt="ログイン" width={140} height={32} className="object-contain w-full h-full" priority />
                </div>
                <span className="text-white font-bold text-[10px] group-hover:opacity-90 transition-opacity duration-200 text-center leading-tight">ログイン</span>
              </Link>
            </div>
          )}
        </div>

        {/* 右側：スマホ表示時のハンバーガーボタン (md未満で表示) */}
        {!isCenteredMode && mounted && !isAuthChecking && (
          <button
            type="button"
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5 z-50 focus:outline-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="メニューを開く"
          >
            <span className="w-8 h-1 bg-white rounded-full transition-all"></span>
            <span className="w-8 h-1 bg-white rounded-full transition-all"></span>
            <span className="w-8 h-1 bg-white rounded-full transition-all"></span>
          </button>
        )}

      </div>

      {/* スマホ用 ドロワーメニュー（背景オーバレイ ＋ 右側からスライドイン） */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden">
          {/* 暗い背景 */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeMenu}
          />

          {/* 右スライドメニュー本体 */}
          <div className="relative w-72 max-w-[80vw] bg-[#54C7F3] h-full shadow-2xl p-6 flex flex-col z-10 overflow-y-auto">

            {/* 閉じるボタン (×) */}
            <button
              type="button"
              className="self-end text-white text-3xl font-bold p-2 mb-4 hover:opacity-80 focus:outline-none"
              onClick={closeMenu}
              aria-label="メニューを閉じる"
            >
              ✕
            </button>

            {/* メニューアイテム一覧 */}
            <div className="flex flex-col gap-3">
              {isLoggedIn ? (
                <>
                  {/* 今日のごはん */}
                  <Link
                    href="/"
                    prefetch={false}
                    onClick={closeMenu}
                    className="bg-white rounded-2xl px-4 py-3 flex items-center gap-4 shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                      <Image src="/images/tubu.svg" width={40} height={40} alt="今日のごはん" className="object-contain max-h-full" />
                    </div>
                    <span className="text-gray-700 font-bold text-sm">今日のごはん</span>
                  </Link>

                  {/* みんなのごはん */}
                  <Link
                    href="/family-summary"
                    prefetch={false}
                    onClick={closeMenu}
                    className="bg-white rounded-2xl px-4 py-3 flex items-center gap-4 shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                      <Image src="/images/ie.svg" width={40} height={40} alt="みんなのごはん" className="object-contain max-h-full" />
                    </div>
                    <span className="text-gray-700 font-bold text-sm">みんなのごはん</span>
                  </Link>

                  {/* プロフィール */}
                  <Link
                    href="/mypage/profile"
                    prefetch={false}
                    onClick={closeMenu}
                    className="bg-white rounded-2xl px-4 py-3 flex items-center gap-4 shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                      <Image src="/images/ume.svg" width={40} height={40} alt="プロフィール" className="object-contain max-h-full" />
                    </div>
                    <span className="text-gray-700 font-bold text-sm">プロフィール</span>
                  </Link>

                  {/* 【代表者限定】ごはん登録 */}
                  {isOwner && (
                    <Link
                      href="/menus"
                      prefetch={false}
                      onClick={closeMenu}
                      className="bg-white rounded-2xl px-4 py-3 flex items-center gap-4 shadow-sm hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                        <Image src="/images/chawan.svg" width={40} height={40} alt="ごはん登録" className="object-contain max-h-full" />
                      </div>
                      <span className="text-gray-700 font-bold text-sm">ごはん登録</span>
                    </Link>
                  )}

                  {/* 【代表者限定】提案履歴 */}
                  {isOwner && (
                    <Link
                      href="/history"
                      prefetch={false}
                      onClick={closeMenu}
                      className="bg-white rounded-2xl px-4 py-3 flex items-center gap-4 shadow-sm hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                        <Image src="/images/tokei.svg" width={40} height={40} alt="提案履歴" className="object-contain max-h-full" />
                      </div>
                      <span className="text-gray-700 font-bold text-sm">提案履歴</span>
                    </Link>
                  )}

                  {/* ログアウト */}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="border-2 border-white rounded-2xl px-4 py-3 flex items-center gap-4 text-white hover:bg-white/10 transition-colors w-full text-left mt-2"
                  >
                    <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                      <Image src="/images/hashi.svg" width={40} height={40} alt="ログアウト" className="object-contain max-h-full" />
                    </div>
                    <span className="font-bold text-sm">ログアウト</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    prefetch={false}
                    onClick={closeMenu}
                    className="bg-white rounded-2xl px-4 py-3 flex items-center gap-4 shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                      <Image src="/images/chawan.svg" width={40} height={40} alt="新規登録" className="object-contain max-h-full" />
                    </div>
                    <span className="text-gray-700 font-bold text-sm">新規登録</span>
                  </Link>
                  <Link
                    href="/login"
                    prefetch={false}
                    onClick={closeMenu}
                    className="border-2 border-white rounded-2xl px-4 py-3 flex items-center gap-4 text-white hover:bg-white/10 transition-colors"
                  >
                    <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                      <Image src="/images/hashi.svg" width={40} height={40} alt="ログイン" className="object-contain max-h-full" />
                    </div>
                    <span className="font-bold text-sm">ログイン</span>
                  </Link>
                </>
              )}
            </div>

          </div>
        </div>
      )}

    </header>
  );
}
