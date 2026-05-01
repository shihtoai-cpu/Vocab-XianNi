/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { User } from '../types';
import { motion } from 'motion/react';
import { LogIn, Sparkles, Trophy } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface GateProps {
  users: User[];
  setView: (v: 'gate' | 'reg' | 'lobby' | 'trial' | 'train' | 'reverse_train' | 'admin') => void;
  setUser: (u: User) => void;
}

export default function Gate({ setView, setUser }: GateProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      if (userDoc.exists()) {
        setUser({ id: userDoc.id, ...userDoc.data() } as User);
        setView('lobby');
      } else {
        // New user - handled by App.tsx's onAuthStateChanged too, 
        // but explicit redirect is safer
        setView('reg');
      }
    } catch (err) {
      console.error(err);
      alert("靈識感應失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-12 h-screen overflow-hidden">
      <div className="text-center space-y-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative inline-block"
        >
          <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 animate-pulse" />
          <h1 className="text-6xl font-black tracking-tighter text-white relative">
            天逆<span className="text-indigo-500">珠</span>
          </h1>
        </motion.div>
        <p className="text-slate-400 font-medium tracking-[0.3em] uppercase text-xs">修仙單字試煉場</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full h-16 glass rounded-2xl flex items-center justify-center space-x-3 text-white font-black tracking-widest hover:bg-white/10 transition-all active:scale-95 group shadow-2xl border border-white/10"
        >
          <LogIn className="group-hover:translate-x-1 transition-transform" />
          <span>{loading ? '感應靈氣中...' : '以 Google 靈識進入'}</span>
        </button>

        <p className="text-center text-[10px] text-slate-500 italic pt-4">
          「修真之道，唯勤不輟；天逆珠現，再造乾坤。」
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full pt-8">
        <div className="glass p-4 rounded-xl space-y-2 border border-white/5">
          <div className="text-indigo-400"><Sparkles size={16} /></div>
          <p className="text-[10px] font-bold text-white uppercase tracking-tight">雲端修為</p>
          <p className="text-[10px] text-slate-500 leading-relaxed">道號、進度即時同步，縱使更換法寶(裝置)亦能續練。</p>
        </div>
        <div className="glass p-4 rounded-xl space-y-2 border border-white/5">
          <div className="text-emerald-400"><Trophy size={16} /></div>
          <p className="text-[10px] font-bold text-white uppercase tracking-tight">萬界排名</p>
          <p className="text-[10px] text-slate-500 leading-relaxed">位列封神碑，與諸天萬界之修士共逐巔峰。</p>
        </div>
      </div>
    </div>
  );
}
