"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function IdleTimer({ timeoutMinutes = 30 }: { timeoutMinutes?: number }) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleLogout = async () => {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("ログアウト処理エラー:", err);
      }
      router.push("/login?reason=timeout");
      router.refresh();
    };

    const resetTimer = () => {
      clearTimeout(timer);
      // テスト用に短くしたい場合は 10 * 1000 (10秒) などに変更して確認できます
      timer = setTimeout(handleLogout, timeoutMinutes * 60 * 1000);
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [router, supabase, timeoutMinutes]);

  return null;
}
