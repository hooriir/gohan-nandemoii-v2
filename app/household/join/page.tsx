import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { getCurrentUserContext } from "@/lib/getCurrentUserContext";
import JoinForm from "./JoinForm";

export default async function JoinHouseholdPage() {
  const userContext = await getCurrentUserContext();

  // 1. 未ログインの場合はログイン画面へ
  if (!userContext || !userContext.user) {
    redirect("/login");
  }

  // 2. すでに世帯に所属している（householdIdが存在する）場合はトップ画面へリダイレクト
  if (userContext.householdId) {
    redirect("/");
  }

  return (
    <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center justify-start p-4 text-white font-sans">
      <Header
        userName={userContext.userName}
        householdName={userContext.householdName}
        isOwner={userContext.isOwner}
      />
      <JoinForm />
    </div>
  );
}
