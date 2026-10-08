import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { getCurrentUserContext } from "@/lib/getCurrentUserContext";
import CreateForm from "./CreateForm";

export default async function CreateHouseholdPage() {
  const userContext = await getCurrentUserContext();

  // 未ログインの場合はログイン画面へ
  if (!userContext || !userContext.user) {
    redirect("/login");
  }

  // すでに世帯に所属している（householdIdが存在する）場合はトップ画面へリダイレクト（二重作成の防止）
  if (userContext.householdId) {
    redirect("/");
  }

  return (
    <div className="bg-[#53cbfb] min-h-screen flex flex-col items-center justify-start p-4 text-white font-sans">
      <Header
        userName={userContext.userName}
        householdName={null}
        isOwner={false}
      />
      <CreateForm />
    </div>
  );
}
