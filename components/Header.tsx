"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/utils/supabase/client";
import { usePathname } from "next/navigation";

// クライアント側（ブラウザ）でマウントされたかを判定するためのヘルパー
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

function useIsMounted() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function Header() {
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useIsMounted();

  const pathname = usePathname();

  // ログイン情報が得られるまではトップページなら中央モードを優先し、レイアウトシフト（チラつき）を防ぐ
  const isCenteredMode = pathname === "/" && !userName;

  useEffect(() => {
    const supabase = createClient();

    async function checkUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const name = session.user.user_metadata?.name || session.user.email?.split("@")[0] || "ユーザー";
          setUserName(name);
        } else {
          setUserName(null);
        }
      } catch (error) {
        console.error("ユーザー情報の取得エラー:", error);
      } finally {
        setIsLoading(false);
      }
    }
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const name = session.user.user_metadata?.name || session.user.email?.split("@")[0] || "ユーザー";
        setUserName(name);
      } else {
        setUserName(null);
      }
      setIsLoading(false);
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
      window.location.href = "/";
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  const isLoggedIn = !!userName;

  return (
    <header className={`w-full max-w-[900px] flex flex-col relative px-4 select-none ${
      isCenteredMode ? "items-center justify-center min-h-[75vh]" : "items-center mb-6 mt-4"
    }`}>
      
      <div className={`flex w-full items-center gap-6 ${
        isCenteredMode 
          ? "flex-col justify-center" 
          : "flex-col sm:flex-row sm:justify-between"
      }`}>
        
        {/* 左側：タイトルロゴ・名前 */}
        <div className={`flex flex-col items-center shrink-0 ${
          isCenteredMode ? "justify-center text-center" : "sm:items-start text-center sm:text-left"
        }`}>
          <p className="text-white text-sm sm:text-base font-bold tracking-wider mb-1 drop-shadow-sm min-h-[1.5rem]">
            {mounted && !isLoading && (isLoggedIn ? `${userName}さんの` : "ゲストさんの")}
          </p>
          <Link href="/" prefetch={false}>
            <Image
              src="/images/title.svg"
              alt="ごはん？なんでもいい～"
              width={400}
              height={125}
              style={{ width: "230px", height: "auto" }}
              className="sm:w-[250px] md:w-[279px] transform hover:scale-105 transition-transform duration-200"
              priority
            />
          </Link>
        </div>

        {/* 右側：ボタンエリア */}
        <div className="flex items-center justify-center shrink-0 min-h-[85px]">
          
          {!mounted || isLoading ? (
            <div className="w-[200px] h-[80px]" />
          ) : isLoggedIn ? (

            /* ログイン時（4つの統一カードボタン） */
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              
              {/* 1. プロフィール */}
              <Link
                href="/mypage/profile"
                prefetch={false}
                className="group bg-white rounded-2xl p-2 w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center shadow-md hover:scale-105 transition-transform duration-200 shrink-0"
              >
                <div className="w-7 h-7 sm:w-9 sm:h-9 mb-1 flex items-center justify-center">
                  <Image
                    src="/images/ume.svg"
                    width={84}
                    height={74}
                    alt="うめぼし"
                    className="object-contain w-full h-full"
                    priority
                  />
                </div>
                <span className="text-gray-700 font-bold text-[9px] sm:text-[10px] group-hover:text-brand-red transition-colors duration-200 text-center leading-tight">
                  プロフィール
                </span>
              </Link>

              {/* 2. ごはん登録 */}
              <Link
                href="/menus"
                prefetch={false}
                className="group bg-white rounded-2xl p-2 w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center shadow-md hover:scale-105 transition-transform duration-200 shrink-0"
              >
                <div className="w-7 h-7 sm:w-9 sm:h-9 mb-1 flex items-center justify-center">
                  <Image
                    src="/images/tubu.svg"
                    width={100}
                    height={165}
                    alt="米粒"
                    className="object-contain w-full h-full"
                    priority
                  />
                </div>
                <span className="text-gray-700 font-bold text-[9px] sm:text-[10px] group-hover:text-brand-red transition-colors duration-200 text-center leading-tight">
                  ごはん登録
                </span>
              </Link>

              {/* 3. 提案履歴 */}
              <Link
                href="/history"
                prefetch={false}
                className="group bg-white rounded-2xl p-2 w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center shadow-md hover:scale-105 transition-transform duration-200 shrink-0"
              >
                <div className="w-7 h-7 sm:w-9 sm:h-9 mb-1 flex items-center justify-center text-lg sm:text-xl">
                  <Image
                    src="/images/tokei.svg"
                    width={100}
                    height={165}
                    alt="時計"
                    className="object-contain w-full h-full"
                    priority
                  />
                </div>
                <span className="text-gray-700 font-bold text-[9px] sm:text-[10px] group-hover:text-brand-red transition-colors duration-200 text-center leading-tight">
                  提案履歴
                </span>
              </Link>

              {/* 4. ログアウト */}
              <button 
                type="button"
                className="group bg-[#54C7F3] border-2 border-white rounded-2xl p-2 w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center shadow-md hover:scale-105 transition-transform duration-200 shrink-0 cursor-pointer" 
                onClick={handleSignOut}
              >
                <div className="w-7 h-7 sm:w-9 sm:h-9 mb-1 flex items-center justify-center">
                  <Image
                    src="/images/hashi.svg"
                    alt="ログアウト"
                    width={140}
                    height={32}
                    className="object-contain w-full h-full"
                    priority
                  />
                </div>
                <span className="text-white font-bold text-[9px] sm:text-[10px] group-hover:opacity-90 transition-opacity duration-200 text-center leading-tight">
                  ログアウト
                </span>
              </button>
            </div>
          ) : (

            /* 未ログイン時（新規登録 ＆ ログイン） */
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* 新規登録 */}
              <Link 
                href="/register" 
                prefetch={false}
                className="group bg-white rounded-2xl p-2 w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center shadow-md hover:scale-105 transition-transform duration-200 shrink-0"
              >
                <div className="w-7 h-7 sm:w-9 sm:h-9 mb-1 flex items-center justify-center">
                  <Image
                    src="/images/chawan.svg"
                    width={130}
                    height={74}
                    alt="茶碗"
                    className="object-contain w-full h-full"
                    priority
                  />
                </div>
                <span className="text-gray-700 font-bold text-[9px] sm:text-[10px] group-hover:text-brand-red transition-colors duration-200 text-center leading-tight">
                  新規登録
                </span>
              </Link>

              {/* ログイン */}
              <Link 
                href="/login" 
                prefetch={false}
                className="group bg-[#54C7F3] border-2 border-white rounded-2xl p-2 w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center shadow-md hover:scale-105 transition-transform duration-200 shrink-0"
              >
                <div className="w-7 h-7 sm:w-9 sm:h-9 mb-1 flex items-center justify-center">
                  <Image
                    src="/images/hashi.svg"
                    alt="ログイン"
                    width={140}
                    height={32}
                    className="object-contain w-full h-full"
                    priority
                  />
                </div>
                <span className="text-white font-bold text-[9px] sm:text-[10px] group-hover:opacity-90 transition-opacity duration-200 text-center leading-tight">
                  ログイン
                </span>
              </Link>
            </div>
          )}

        </div>

      </div>
    </header>
  );
}