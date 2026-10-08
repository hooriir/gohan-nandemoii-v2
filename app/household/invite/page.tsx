import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { getCurrentUserContext } from "@/lib/getCurrentUserContext";
import InviteForm from "./InviteForm";

export default async function InvitePage() {
  const userContext = await getCurrentUserContext();

  // 未ログインまたは世帯未作成の場合はリダイレクト
  if (!userContext || !userContext.householdName) {
    redirect("/login");
  }

  // 代表者（オーナー）以外は招待ページに入れないようにガードする場合
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
