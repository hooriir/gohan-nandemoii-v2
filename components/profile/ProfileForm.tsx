"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { leaveHousehold } from "@/app/mypage/profile/actions";

interface ProfileFormProps {
  initialData: {
    name: string;
    email: string;
    isGoogleUser: boolean;
    householdName: string;
    hasHousehold: boolean;
    role?: string | null;
  };
}

export default function ProfileForm({ initialData }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLeaveHousehold = () => {
    setErrorMessage(null);
    if (!confirm(`本当に「${initialData.householdName}」から脱退しますか？`)) {
      return;
    }

    startTransition(async () => {
      const res = await leaveHousehold();
      if (res?.error) {
        setErrorMessage(res.error);
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-100 w-full max-w-md">
      <h2 className="text-[#54C7F3] text-center text-2xl font-black mb-8 tracking-wider">
        プロフィール設定
      </h2>

      {/* エラーメッセージ表示 */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl text-center">
          {errorMessage}
        </div>
      )}

      {/* フォーム項目 */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">
            お名前
          </label>
          <input
            type="text"
            value={initialData.name}
            disabled
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 font-bold"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">
            メールアドレス
          </label>
          <input
            type="email"
            value={initialData.email}
            disabled
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 font-bold"
          />
        </div>

        {/* 所属世帯エリア */}
        {initialData.hasHousehold && (
          <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
            <label className="block text-xs font-bold text-gray-400 mb-2">
              所属世帯
            </label>
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="font-black text-gray-700 text-base">
                {initialData.householdName}
              </span>

              <button
                type="button"
                disabled={isPending}
                onClick={handleLeaveHousehold}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                {isPending ? "脱退中..." : "世帯から脱退する"}
              </button>
            </div>

            {/* 代表者（OWNER）の場合のみ表示する招待コード発行ボタン */}
            {initialData.role === "OWNER" && (
              <div className="pt-2">
                <Link
                  href="/household/invite"
                  className="w-full inline-flex items-center justify-center bg-[#54C7F3] hover:bg-[#3dbbe8] text-white font-bold text-sm py-2.5 px-4 rounded-xl shadow-sm transition-colors"
                >
                  招待コードを発行する
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
