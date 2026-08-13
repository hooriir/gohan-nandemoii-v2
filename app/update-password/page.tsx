"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/Button";
import { createClient } from "@/utils/supabase/client";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError("有効な再設定セッションが見つかりません。もう一度パスワード再設定メールをリクエストしてください。");
      }
      setIsCheckingSession(false);
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("パスワードが一致しません。");
      return;
    }

    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください。");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.warn("パスワード更新失敗:", updateError.message);
        setError(
          "パスワードの更新に失敗しました。リンクの有効期限が切れている可能性があります。もう一度再設定メールを送信してください。"
        );
        setIsSubmitting(false);
        return;
      }

      setMessage("パスワードの変更が完了しました！ログイン画面に移動します...");

      setTimeout(() => {
        router.push("/login");
      }, 2000);
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

        <h2 className="text-xl font-bold text-slate-700 mb-6">
          新しいパスワードの設定
        </h2>

        {message && (
          <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-medium py-3 px-4 rounded-xl mb-4 text-left whitespace-pre-wrap">
            {message}
          </div>
        )}

        {error && (
          <p className="bg-red-50 text-red-600 border border-red-200 text-sm font-medium py-2 px-3 rounded-xl mb-4 text-left whitespace-pre-wrap">
            {error}
          </p>
        )}

        {isCheckingSession ? (
          <p className="text-sm text-slate-400 py-4">セッションを確認中...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">
                新しいパスワード
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting || !!message}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all text-slate-800 placeholder:text-slate-300 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">
                新しいパスワード（確認）
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isSubmitting || !!message}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all text-slate-800 placeholder:text-slate-300 disabled:bg-slate-50"
              />
            </div>

            <Button
              type="submit"
              text={isSubmitting ? "更新中..." : "パスワードを変更する"}
              variant="blue"
              disabled={isSubmitting || !!message}
            />
          </form>
        )}
      </div>
    </div>
  );
}