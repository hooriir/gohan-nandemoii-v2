import Image from "next/image";
import { registerUser } from "../actions";
import Button from "@/components/Button";
import Link from "next/link";
import GoogleAuthButton from "@/components/GoogleAuthButton";

export default function RegisterPage() {
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
        
        <h2 className="text-xl font-bold text-slate-700 mb-8">新規登録</h2>

        <form action={registerUser} className="space-y-5 text-left">
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">お名前</label>
            <input
              type="text"
              name="name"
              required
              placeholder="ごはん 太郎"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all text-slate-800 placeholder:text-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">メールアドレス</label>
            <input
              type="email"
              name="email"
              required
              placeholder="example@email.com"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all text-slate-800 placeholder:text-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">パスワード</label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all text-slate-800 placeholder:text-slate-300"
            />
          </div>

          <Button type="submit" text="登録する" variant="red" />

          <div className="pt-4 text-center border-t border-slate-100 mt-4 space-y-3">
            <div>
              <span className="text-xs text-slate-400 block mb-2">すでにアカウントをお持ちですか？</span>
              <Link 
                href="/login" 
                className="block w-full py-3 px-4 bg-sky-400 hover:bg-sky-500 text-white font-bold rounded-xl text-center text-sm transition-all shadow-sm"
              >
                ログインはこちら
              </Link>
            </div>

            <GoogleAuthButton label="Googleで登録・ログイン" />
          </div>
        </form>
      </div>
    </div>
  );
}