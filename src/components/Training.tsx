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
  const [overlay, setOverlay] = useState<{ msg: string; type: 'fail' } | null>(null);
  
  useEffect(() => {
    if (user.qi < 1) {
      setOverlay({ msg: "靈氣枯竭，天逆空間法陣崩解！請服用聚靈丹或閉關。", type: 'fail' });
      setTimeout(() => setView('lobby'), 3000);
      return;
    }
    if (words.length > 0) next();
  }, [words]);

  const next = () => {
    if (user.qi < 1) {
       setView('lobby'); // Auto exit if out of Qi
       return;
    }
    setCur(words[Math.floor(Math.random() * words.length)]);
  };

  if (!cur || overlay) return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
      {overlay ? (
        <div className="p-8 rounded-3xl border border-red-500/50 bg-red-950/40 text-red-500 text-center space-y-4 max-w-sm animate-in fade-in">
          <h3 className="text-xl font-black uppercase tracking-widest">靈氣枯竭</h3>
          <p className="text-sm font-bold leading-relaxed">{overlay.msg}</p>
        </div>
      ) : (
        <>
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">感應天逆空間...</p>
        </>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <header className="px-4 py-3 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">天逆空間</span>
          <span className="text-xs font-mono font-bold text-slate-300">神：{user.shen}</span>
        </div>
      </header>
      <div className="flex-1 flex flex-col overflow-hidden px-4 pb-4">
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
              [wordKey]: { c: prevH.c + (ok ? 1 : 0), w: prevH.w + (ok ? 0 : 1) }
            };

            const updated = {
              ...user,
              qi: Math.max(0, user.qi - 1), // 每答一題消耗 1 點靈氣
              totalAncientExp: user.totalAncientExp + (ok ? 1 : 0), // 永久累積神識
              stats: {
                ...user.stats,
                wordStats: { ...currentWordStats, [wordKey]: newWordScore },
                wordHistory: updatedHistory
              }
            };
            onUpdate(updated);
            next();
          }}
          onBack={() => { onUpdate(user); setView('lobby'); }} 
        />
      </div>
    </div>
  );
}
