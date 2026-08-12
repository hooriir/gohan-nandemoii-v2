'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/Header'; 
import { createClient } from '@/utils/supabase/client'; 
import { updateProfile } from '../../actions'; 

export default function ProfilePage() {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [email, setEmail] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isGoogleUser, setIsGoogleUser] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        router.push('/login');
        return;
      }

      const googleProvider = user.app_metadata?.provider === 'google' ||
        user.identities?.some((identity) => identity.provider === 'google');
      setIsGoogleUser(!!googleProvider);

      const currentName = user.user_metadata?.name || '';
      const currentEmail = user.email || '';
      setName(currentName);
      setSavedName(currentName);
      setEmail(currentEmail);
      setSavedEmail(currentEmail);
      setIsLoading(false);
    }

    loadUser();
  }, [router]);

  const handleStartEdit = () => {
    setPassword('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setName(savedName);
    setEmail(savedEmail);
    setPassword('');
    setIsEditing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('password', password);

      await updateProfile(formData);
      
      alert('プロフィールを更新しました！');
      setSavedName(name);
      setSavedEmail(email);
      setPassword('');
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('保存中にエラーが発生しました。');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#54C7F3] min-h-screen flex flex-col font-sans">
      <main className="flex-1 flex flex-col items-center py-8 px-4">

        <Header />

        <div className="flex flex-row gap-6 sm:gap-8 max-w-4xl w-full px-4 items-start justify-center">

          <div className="bg-white rounded-2xl p-8 shadow-xl flex-1 w-full min-h-[250px] flex flex-col justify-center items-center">
            <h2 className="text-[#54C7F3] text-center text-2xl font-black mb-8 tracking-wider">
              プロフィール設定
            </h2>

            {isLoading ? (
            <div className="flex flex-col items-center justify-center text-[#54C7F3] min-h-[300px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#54C7F3] mb-4"></div>
              <p className="font-bold text-xs tracking-widest text-gray-400">
                プロフィールを読み込んでいます...
              </p>
            </div>
          ) : !isEditing ? (
              <div className="text-center space-y-3 w-full max-w-sm">
                <h3 className="text-2xl font-black text-gray-800 tracking-wide mb-4">{name || '名前未設定'}</h3>
                <p className="text-sm text-gray-600 font-medium">メールアドレス：{email}</p>
                
                {!isGoogleUser && (
                  <p className="text-sm text-gray-400 font-medium">パスワード：••••••••</p>
                )}
                
                <div className="pt-6">
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="bg-[#54C7F3] text-white font-bold text-xs px-6 py-2.5 rounded-lg shadow hover:bg-[#42b3de] transition"
                  >
                    変更する
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="w-full max-w-xs space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 ml-1">名前</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSaving}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-[#54C7F3] text-slate-800 disabled:bg-slate-50"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 ml-1">メールアドレス</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSaving || isGoogleUser}
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-[#54C7F3] text-slate-800 ${
                      isGoogleUser ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'disabled:bg-slate-50'
                    }`}
                    required
                  />
                  {isGoogleUser && (
                    <p className="text-[10px] text-slate-400 ml-1">
                      ※Googleログインのため変更できません
                    </p>
                  )}
                </div>

                {!isGoogleUser && (
                  <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-500 ml-1">現在のパスワード</label>
                      <input
                        type="text"
                        value="••••••••"
                        disabled
                        className="w-full px-3 py-2 text-sm border border-gray-200 bg-gray-50 text-gray-400 rounded-xl cursor-not-allowed select-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-500 ml-1">新しいパスワード</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSaving}
                        placeholder="変更する場合のみ入力"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-[#54C7F3] text-slate-800 placeholder:text-slate-300 disabled:bg-slate-50"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="flex-1 border border-slate-300 text-slate-500 font-bold text-xs py-2.5 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-[#54C7F3] text-white font-bold text-xs py-2.5 rounded-lg shadow hover:bg-[#42b3de] transition disabled:bg-slate-300"
                  >
                    {isSaving ? '保存中...' : '保存する'}
                  </button>
                </div>
              </form>
            )}

          </div>

        </div>
      </main>
    </div>
  );
}