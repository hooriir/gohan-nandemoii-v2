"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";

const TIMEOUT_MS = 15 * 60 * 1000;
const THROTTLE_MS = 1000;

export default function AutoLogoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const lastActivityRef = useRef<number>(0);

  const supabase = useMemo(() => createClient(), []);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/login?reason=timeout";
    } catch (error) {
      console.error("自動ログアウト失敗:", error);
    }
  }, [supabase]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(handleLogout, TIMEOUT_MS);
  }, [handleLogout]);

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    lastActivityRef.current = Date.now();

    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current > THROTTLE_MS) {
        lastActivityRef.current = now;
        resetTimer();
      }
    };

    const setupListeners = () => {
      events.forEach((e) =>
        window.addEventListener(e, handleUserActivity, { passive: true })
      );
    };

    const removeListeners = () => {
      events.forEach((e) =>
        window.removeEventListener(e, handleUserActivity)
      );
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        lastActivityRef.current = Date.now();
        resetTimer();
        setupListeners();
      } else {
        if (timerRef.current) clearTimeout(timerRef.current);
        removeListeners();
      }
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      removeListeners();
      subscription.unsubscribe();
    };
  }, [supabase, resetTimer]);

  return <>{children}</>;
}