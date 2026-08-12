import Header from "@/components/Header";

export default function Loading() {
  return (
    <div className="bg-[#54C7F3] min-h-screen flex flex-col font-sans">
      <main className="flex-1 flex flex-col items-center py-8 px-4">
        
        <Header />

        <div className="bg-white rounded-2xl p-12 sm:p-16 shadow-xl max-w-2xl w-full flex flex-col items-center justify-center min-h-[300px]">
          
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#54C7F3] mb-4"></div>
          
          <p className="font-bold text-xs tracking-widest text-slate-400">
            提案履歴を読み込んでいます...
          </p>

        </div>
      </main>
    </div>
  );
}