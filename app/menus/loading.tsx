import Header from "@/components/Header";

export default function Loading() {
  return (
    <div className="bg-[#53cbfb] min-h-screen p-4 sm:p-8 flex flex-col items-center font-sans">
      <Header />
      
      <div className="w-full max-w-[900px] flex flex-row gap-6 items-start justify-center mt-6">
        <div className="flex-1 bg-white rounded-3xl shadow-xl p-12 sm:p-16 border border-slate-100 w-full min-w-0 flex flex-col items-center justify-center">
          
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#53cbfb] mb-4"></div>
          
          <p className="text-gray-500 font-bold text-sm tracking-wider">
            ごはん登録を読み込んでいます...
          </p>

        </div>
      </div>
    </div>
  );
}