/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User } from '../types';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { auth } from '../lib/firebase';

const AVATARS = [
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
];

interface RegisterProps {
  onBack: () => void;
  onDone: (user: User) => void;
  users: User[];
}

export default function Register({ onBack, onDone, users }: RegisterProps) {
  const [n, setN] = useState(""); 
  const [a, setA] = useState(AVATARS[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.currentUser) {
      // If it's a nickname-only auth (ends with @xianni.auth)
      const email = auth.currentUser.email || "";
      if (email.endsWith("@xianni.auth")) {
        setN(email.split("@")[0]);
      } else {
        setN(auth.currentUser.displayName || "");
      }
      
      if (auth.currentUser.photoURL) setA(auth.currentUser.photoURL);
    }
  }, []);

  const handleRegister = () => {
    const trimmedName = n.trim();
    if (!trimmedName) return;

    // Check for duplicate name
    const isDuplicate = users.some(u => u.name.toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      setError("此道號已有人使用，請重新感悟。");
      return;
    }

    onDone({ 
      name: trimmedName, 
        pw: '', // Not used with Google Auth
        avatar: a, 
        jing: 20, 
        qi: 20, 
        shen: 20,
        maxJing: 20,
        maxQi: 20,
        maxShen: 20,
        totalExp: 0,
        totalAncientExp: 0,
        lastRefresh: Date.now(),
        realm: '凝氣期',
        items: {
          bloodPill: 0,
          qiPill: 0,
          spiritPill: 0,
          spiritJade: 0
        },
        stats: { 
          rounds: 0, 
          lastDate: new Date().toISOString().split('T')[0],
          wordStats: {},
          wordHistory: {}
        }
      });
  };

  return (
    <div className="flex-1 flex flex-col p-8 space-y-8 animate-in slide-in-from-bottom h-screen overflow-hidden">
      <header className="flex items-center space-x-4 mt-8">
        <button onClick={onBack} className="p-2 text-slate-500 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-black text-white uppercase tracking-widest">初登仙冊</h2>
      </header>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">道號</label>
          <input 
            type="text" 
            value={n}
            onChange={(e) => {
              setN(e.target.value);
              setError(null);
            }}
            disabled={auth.currentUser?.email?.endsWith("@xianni.auth")}
            placeholder="輸入汝之修真稱號..."
            className={`w-full h-14 glass rounded-xl px-6 text-white font-bold border ${error ? 'border-red-500/50' : 'border-white/5'} focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-700 ${auth.currentUser?.email?.endsWith("@xianni.auth") ? 'opacity-50 cursor-not-allowed bg-white/5' : ''}`}
          />
          {error && (
            <p className="text-red-400 text-[10px] font-bold mt-1 pl-1 animate-pulse">{error}</p>
          )}
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">化身形態</label>
          <div className="grid grid-cols-3 gap-4">
            {AVATARS.map(url => (
              <button 
                key={url}
                onClick={() => setA(url)}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${a === url ? 'border-indigo-500 scale-95 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'border-transparent opacity-40 hover:opacity-100'}`}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                {a === url && (
                  <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                    <Check size={20} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-8">
        <button 
          onClick={handleRegister}
          disabled={!n.trim()}
          className="w-full h-16 bg-indigo-600 rounded-2xl flex items-center justify-center space-x-3 text-white font-black tracking-widest hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed shadow-2xl shadow-indigo-500/20"
        >
          <Sparkles size={20} />
          <span>確認入冊</span>
        </button>
        <p className="text-[10px] text-slate-600 text-center mt-6">
          「一入修真深似海，從此凡塵是路人。」
        </p>
      </div>
    </div>
  );
}
