"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/Button";
import { createClient } from "@/utils/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const cleanEmail = email.trim();

      const origin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const redirectUrl = `${origin}/update-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: redirectUrl,
        }
      );

      if (resetError) {
        console.warn("パスワード再設定メール送信失敗:", resetError.message);
        setError("メールの送信に失敗しました。メールアドレスをご確認ください。");
        setIsSubmitting(false);
        return;
      }

      setMessage(
        "パスワード再設定用のメールを送信しました。\nメール内のリンクから新しいパスワードを設定してください。"
      );
      setEmail("");
    } catch (err: unknown) {
      console.error("システム例外エラー:", err);
      setError("通信中に予期せぬエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-brand-bg min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-[400px] text-center">
        
        <h1 className="flex justify-center mb-2">
          <Image
            src="/images/gohan_bl.svg"
            alt="ごはん？なんでもいい～"
            width={160}
            height={72}
            style={{ width: "160px", height: "auto" }}
          />
        </h1>

        <h2 className="text-xl font-bold text-slate-700 mb-2">
          パスワードをお忘れの方
        </h2>
        
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          ご登録のメールアドレスを入力してください。<br />
          パスワード再設定用のリンクをお送りします。
        </p>

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

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">
              メールアドレス
            </label>
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

          <Button
            type="submit"
            text={isSubmitting ? "送信中..." : "再設定メールを送信"}
            variant="blue"
          />

          <div className="pt-4 text-center border-t border-slate-100 mt-4">
            <Link
              href="/login"
              className="text-xs font-bold text-slate-500 hover:text-brand-blue hover:underline transition-all"
            >
              ← ログイン画面に戻る
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}