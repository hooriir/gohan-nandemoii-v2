'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { createClient } from '@/utils/supabase/client';
import { updateProfile } from '../../actions';

export default function ProfilePage() {
  const router = useRouter();

  // プロフィール用state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [email, setEmail] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  // 世帯用state
  const [householdName, setHouseholdName] = useState('');
  const [savedHouseholdName, setSavedHouseholdName] = useState('');
  const [isHouseholdEditing, setIsHouseholdEditing] = useState(false);
  const [isHouseholdSaving, setIsHouseholdSaving] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadData() {
      try {
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

        // 世帯情報の取得
        const res = await fetch('/api/household/me');
        if (res.ok) {
          const data = await res.json();
          if (data.hasHousehold && data.household?.name) {
            setHouseholdName(data.household.name);
            setSavedHouseholdName(data.household.name);
          }
        }
      } catch (err) {
        console.error('データ読み込みエラー:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
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

  // 世帯名保存のハンドラー
  const handleSaveHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHouseholdSaving) return;

    setIsHouseholdSaving(true);
    try {
      const res = await fetch('/api/household/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: householdName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '世帯名の更新に失敗しました。');
      }

      alert('世帯名を更新しました！');
      setSavedHouseholdName(householdName);
      setIsHouseholdEditing(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('世帯名の保存中にエラーが発生しました。');
      }
    } finally {
      setIsHouseholdSaving(false);
    }
  };

  const handleCancelHouseholdEdit = () => {
    setHouseholdName(savedHouseholdName);
    setIsHouseholdEditing(false);
  };

  return (
    <div className="bg-[#54C7F3] min-h-screen flex flex-col font-sans">
      <main className="flex-1 flex flex-col items-center py-8 px-4">

        <Header />

        <div className="flex flex-col md:flex-row gap-6 sm:gap-8 max-w-4xl w-full px-4 items-stretch justify-center">

          {/* 2. 世帯設定カード（追加部分） */}
          <div className="bg-white rounded-2xl p-8 shadow-xl flex-1 w-full min-h-[320px] flex flex-col justify-start items-center">
            <h2 className="text-[#54C7F3] text-center text-xl font-black mb-6 tracking-wider">
              世帯設定
            </h2>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center text-[#54C7F3] min-h-[200px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#54C7F3] mb-3"></div>
                <p className="font-bold text-xs tracking-widest text-gray-400">読み込み中...</p>
              </div>
            ) : !isHouseholdEditing ? (
              <div className="text-center space-y-4 w-full max-w-sm">
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-1">所属している世帯名</p>
                  <h3 className="text-xl font-black text-gray-800 tracking-wide">{householdName || '世帯未所属'}</h3>
                </div>

                <div className="pt-8">
                  <button
                    type="button"
                    onClick={() => setIsHouseholdEditing(true)}
                    className="bg-[#54C7F3] text-white font-bold text-xs px-6 py-2.5 rounded-lg shadow hover:bg-[#42b3de] transition"
                  >
                    世帯名を変更する
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveHousehold} className="w-full max-w-xs space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 ml-1">世帯名</label>
                  <input
                    type="text"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    disabled={isHouseholdSaving}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-[#54C7F3] text-slate-800 disabled:bg-slate-50"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-6">
                  <button
                    type="button"
                    onClick={handleCancelHouseholdEdit}
                    disabled={isHouseholdSaving}
                    className="flex-1 border border-slate-300 text-slate-500 font-bold text-xs py-2.5 rounded-lg hover:bg-slate-50 transition"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isHouseholdSaving}
                    className="flex-1 bg-[#54C7F3] text-white font-bold text-xs py-2.5 rounded-lg shadow hover:bg-[#42b3de] transition"
                  >
                    {isHouseholdSaving ? '保存中...' : '保存する'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 1. プロフィール設定カード */}
          <div className="bg-white rounded-2xl p-8 shadow-xl flex-1 w-full min-h-[320px] flex flex-col justify-start items-center">
            <h2 className="text-[#54C7F3] text-center text-xl font-black mb-6 tracking-wider">
              プロフィール設定
            </h2>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center text-[#54C7F3] min-h-[200px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#54C7F3] mb-3"></div>
                <p className="font-bold text-xs tracking-widest text-gray-400">読み込み中...</p>
              </div>
            ) : !isEditing ? (
              <div className="text-center space-y-3 w-full max-w-sm">
                <h3 className="text-xl font-black text-gray-800 tracking-wide mb-3">{name || '名前未設定'}</h3>
                <p className="text-sm text-gray-600 font-medium">メール：{email}</p>

                {!isGoogleUser && (
                  <p className="text-sm text-gray-400 font-medium">パスワード：••••••••</p>
                )}

                <div className="pt-4">
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
                    <p className="text-[10px] text-slate-400 ml-1">※Googleログインのため変更不可</p>
                  )}
                </div>

                {!isGoogleUser && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
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

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="flex-1 border border-slate-300 text-slate-500 font-bold text-xs py-2.5 rounded-lg hover:bg-slate-50 transition"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-[#54C7F3] text-white font-bold text-xs py-2.5 rounded-lg shadow hover:bg-[#42b3de] transition"
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
