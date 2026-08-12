'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const getButtonClass = (path: string) => {
    // ★ 常に border-2 に統一して枠線幅の変化によるサイズのズレ（ガタつき）を100%防止
    const baseClass =
      "flex flex-col items-center bg-white p-3 rounded-2xl shadow-md transition-colors duration-150 w-full text-center shrink-0 border-2";

    if (isActive(path)) {
      // アクティブ時は水色枠
      return `${baseClass} border-[#00b2fe] text-slate-700`;
    }
    // 通常時は薄いグレー枠（太さは同じ2px）
    return `${baseClass} border-slate-100 hover:bg-slate-50 text-slate-600`;
  };

  return (
    <div className="w-[160px] flex flex-col gap-3 shrink-0 items-center">

      <Link 
        href="/mypage/profile" 
        prefetch={false} 
        className={getButtonClass('/mypage/profile')}
      >
        <Image 
          src="/images/ume.svg" 
          width={53} 
          height={46} 
          alt='うめぼし' 
          className="w-10 h-10 mb-1 object-contain" 
          priority
        />
        <span className="text-[10px] font-bold">プロフィール</span>
      </Link>
      
      <Link 
        href="/menus" 
        prefetch={false} 
        className={getButtonClass('/menus')}
      >
        <Image 
          src="/images/chawan.svg" 
          width={80} 
          height={46} 
          alt='茶碗' 
          className="w-10 h-10 mb-1 object-contain" 
          priority
        />
        <span className="text-[10px] font-bold">ごはん登録・一覧</span>
      </Link>

    </div>
  );
}