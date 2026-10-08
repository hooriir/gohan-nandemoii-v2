import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { getCurrentUserContext } from "@/lib/getCurrentUserContext";
import InviteForm from "./InviteForm";

export default async function InvitePage() {
  const userContext = await getCurrentUserContext();

  // 1. 未ログインの場合はログイン画面へ
  if (!userContext || !userContext.user) {
    redirect("/login");
  }

  // 2. 世帯未所属（householdIdが存在しない）場合は世帯作成ページへ
  if (!userContext.householdId) {
    redirect("/household/create");
  }

  // 3. 代表者（オーナー）以外は招待ページに入れないようにガード
  if (!userContext.isOwner) {
    redirect("/");
  }

  return (
    <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center justify-start p-4 text-white font-sans">
      <Header
        userName={userContext.userName}
        householdName={userContext.householdName}
        isOwner={userContext.isOwner}
      />
      <InviteForm />
    </div>
  );
}
