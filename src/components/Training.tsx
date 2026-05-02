/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User, Word } from '../types';
import FlipEngine from './FlipEngine';
import { ChevronLeft } from 'lucide-react';

interface TrainingProps {
  user: User;
  words: Word[];
  onUpdate: (u: User) => void;
  setView: (v: any) => void;
}

export default function Training({ user, words, onUpdate, setView }: TrainingProps) {
  const [cur, setCur] = useState<Word | null>(null);
  
  useEffect(() => {
    if (words.length > 0) next();
  }, [words]);

  const next = () => {
    setCur(words[Math.floor(Math.random() * words.length)]);
  };

  if (!cur) return (
    <div className="p-10 text-center flex flex-col items-center justify-center h-screen space-y-4 bg-slate-950">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-slate-500 font-bold">正在感應天逆空間...</p>
      {words.length === 0 && (
        <div className="space-y-4 pt-4">
          <p className="text-amber-500 text-xs">仙冊空虛，無經書可練</p>
          <button onClick={() => setView('lobby')} className="px-8 py-3 glass rounded-xl text-indigo-400 font-bold uppercase tracking-widest border border-indigo-500/20 active:scale-95 transition-all">
            暫歸洞府
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 h-screen flex flex-col overflow-hidden bg-slate-950">
      <header className="mt-12 mb-8 px-2 flex justify-between items-start">
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => { onUpdate(user); setView('lobby'); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 group border border-white/5 shadow-xl"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black tracking-widest uppercase">封印修為並遁走</span>
          </button>
          
          <div className="flex flex-col pl-2">
            <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em]">天逆空間</span>
            <span className="text-[9px] text-slate-600 font-mono tracking-tighter">累修題數：{user.stats.spirit}</span>
          </div>
        </div>
      </header>
      <FlipEngine 
        word={cur.en} 
        zh={cur.zh} 
        pos={cur.pos}
        onResult={(ok, pts) => {
          const wordKey = cur.en;
          const currentWordStats = user.stats.wordStats || {};
          const oldScore = currentWordStats[wordKey] || 0;
          
          let newWordScore = ok ? oldScore + pts : Math.floor(oldScore * 0.5);
          newWordScore = Math.max(0, Math.min(100, newWordScore));

          const currentHistory = user.stats.wordHistory || {};
          const prevH = currentHistory[wordKey] || { c: 0, w: 0 };
          const updatedHistory = {
            ...currentHistory,
            [wordKey]: {
              c: prevH.c + (ok ? 1 : 0),
              w: prevH.w + (ok ? 0 : 1)
            }
          };

          const updated = {
            ...user,
            stats: {
              ...user.stats,
              spirit: user.stats.spirit + (ok ? 1 : 0),
              wordStats: {
                ...currentWordStats,
                [wordKey]: newWordScore
              },
              wordHistory: updatedHistory
            }
          };
          onUpdate(updated);
          next();
        }}
        onBack={() => { onUpdate(user); setView('lobby'); }} 
      />
    </div>
  );
}
