"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/Button";
import { createClient } from "@/utils/supabase/client";
import GoogleAuthButton from "@/components/GoogleAuthButton";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const isTimeout = searchParams.get("reason") === "timeout";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const cleanEmail = email.trim();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (signInError) {
        console.warn("ログイン失敗:", signInError.message);

        if (signInError.message === "Invalid login credentials") {
          setError("メールアドレスまたはパスワードが正しくありません。");
        } else if (signInError.message.includes("Email not confirmed")) {
          setError("メールアドレスの確認が完了していません。受信トレイをご確認ください。");
        } else {
          setError("ログインに失敗しました。入力内容をご確認ください。");
        }

        setIsSubmitting(false);
        return;
      }

      if (data.session) {
        await supabase.auth.setSession(data.session);
      }

      router.push("/");
      router.refresh();

    } catch (err: unknown) {
      console.error("システム例外エラー:", err);
      setError("通信中に予期せぬエラーが発生しました");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-brand-bg min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-[400px] text-center">

        <h1 className="flex justify-center mb-2">
          <Link href="/">
            <Image
              src="/images/gohan_bl.svg"
              alt="ごはん？なんでもいい～"
              width={160}
              height={72}
              style={{ width: "160px", height: "auto" }}
            />
          </Link>
        </h1>

        <h2 className="text-xl font-bold text-slate-700 mb-6">ログイン</h2>

        {isTimeout && (
          <div className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold p-3 rounded-xl mb-4 text-center">
            長時間操作がなかったため、安全のため自動ログアウトしました。
          </div>
        )}

        {error && (
          <p className="bg-red-50 text-red-600 border border-red-200 text-sm font-medium py-2 px-3 rounded-xl mb-4 text-left whitespace-pre-wrap">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">メールアドレス</label>
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all text-slate-800 placeholder:text-slate-300 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">パスワード</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all text-slate-800 placeholder:text-slate-300 disabled:bg-slate-50"
            />
          </div>

          <Button type="submit" text={isSubmitting ? "ログイン中..." : "ログイン"} variant="blue" />

          <div className="text-center pt-1">
            <Link
              href="/forgot-password"
              className="text-xs text-slate-400 hover:text-brand-blue hover:underline transition-all"
            >
              パスワードをお忘れですか？
            </Link>
          </div>

          <div className="pt-4 text-center border-t border-slate-100 mt-4 space-y-3">
            <div>
              <p className="text-xs text-slate-400 mb-2">アカウントをお持ちでないですか？</p>
              <Link
                href="/register"
                className="block w-full py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-center text-sm transition-all shadow-sm"
              >
                新規登録はこちら
              </Link>
            </div>

            <GoogleAuthButton label="Googleでログイン" />
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="bg-brand-bg min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
