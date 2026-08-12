import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import { redirect } from "next/navigation";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  if (!supabaseUser || !supabaseUser.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser.id },
  });

  if (!dbUser) {
    return (
      <div className="bg-[#54C7F3] min-h-screen flex flex-col font-sans">
        <main className="flex-1 flex flex-col items-center py-8 px-4">
          <Header />
          <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full text-center text-slate-600 font-bold">
            ユーザー情報が見つかりません。
          </div>
        </main>
      </div>
    );
  }

  const logs = await prisma.dishShowLog.findMany({
    where: { userId: dbUser.id },
    include: {
      dish: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="bg-[#54C7F3] min-h-screen flex flex-col font-sans">
      <main className="flex-1 flex flex-col items-center py-8 px-4">
        
        <Header />

        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl max-w-2xl w-full">
          
          <h1 className="text-xl sm:text-2xl font-black text-[#54C7F3] mb-6 flex items-center justify-center gap-2 tracking-wider">
            これまでの提案履歴
          </h1>

          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="mb-4 font-bold text-sm">
                まだ履歴がありません。たくさん提案をもらいましょう！
              </p>
              <Link
                href="/"
                className="inline-block bg-[#54C7F3] text-white font-bold text-xs px-6 py-2.5 rounded-lg shadow hover:bg-[#42b3de] transition"
              >
                さっそくごはんを決める！
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const dishName = log.dish?.name || "おすすめ料理";
                const imageUrl = log.dish?.imageUrl || null;

                return (
                  <div 
                    key={log.id} 
                    className="flex items-center gap-4 p-3 sm:p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    {imageUrl ? (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 relative rounded-lg overflow-hidden flex-shrink-0 bg-white border border-slate-100">
                        <Image
                          src={imageUrl}
                          alt={dishName}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white border border-slate-100 flex items-center justify-center rounded-lg text-2xl flex-shrink-0">
                        🍽️
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 text-base sm:text-lg truncate">
                        {dishName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        キーワード:{" "}
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600">
                          {log.keyword || "指定なし"}
                        </span>
                      </p>
                    </div>

                    <div className="text-right text-[10px] sm:text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString("ja-JP", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}