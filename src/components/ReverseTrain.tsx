/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { RotateCcw, ChevronLeft } from 'lucide-react';
import { Word, User } from '../types';
import HandwritingEngine from './HandwritingEngine';

interface ReverseTrainProps {
  words: Word[];
  user: User;
  onUpdate: (u: User) => void;
  setView: (v: any) => void;
}

export default function ReverseTrain({ words, user, onUpdate, setView }: ReverseTrainProps) {
  const [curIdx, setCurIdx] = useState(0);
  const [shuffled, setShuffled] = useState<Word[]>([]);

  useEffect(() => {
    if (words && words.length > 0) {
      setShuffled([...words].sort(() => Math.random() - 0.5));
    }
  }, [words]);

  const nextWord = () => {
    if (curIdx + 1 < shuffled.length) {
      setCurIdx(prev => prev + 1);
    } else {
      setShuffled([...words].sort(() => Math.random() - 0.5));
      setCurIdx(0);
    }
  };

  const prevWord = () => {
    if (curIdx > 0) {
      setCurIdx(prev => prev - 1);
    }
  };

  if (!shuffled || shuffled.length === 0) return <div className="p-10 text-white text-center">神識感應中...</div>;

  return (
    <div className="h-screen flex flex-col bg-[#020617] overflow-hidden">
      <header className="p-6 flex justify-between items-start mt-8 mb-4">
        <div className="flex flex-col gap-6">
          <button 
            onClick={() => { onUpdate(user); setView('lobby'); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 group border border-white/5 shadow-xl w-fit"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black tracking-widest uppercase">儲存修為並遁走</span>
          </button>
          
          <div className="flex items-center space-x-6 pl-2">
            <button 
              onClick={prevWord}
              disabled={curIdx === 0}
              className={`p-2 transition-all rounded-lg border border-white/5 bg-white/5 ${curIdx === 0 ? 'opacity-20 cursor-not-allowed' : 'opacity-60 hover:opacity-100 hover:text-white text-indigo-400 active:scale-90'}`}
              title="回溯前緣 (上一題)"
            >
              <RotateCcw size={16} />
            </button>
            <div className="flex flex-col">
              <span className="text-indigo-400 font-black text-[10px] tracking-[0.2em] uppercase">
                逆練神識
              </span>
              <span className="text-slate-600 font-mono text-[9px] tracking-tighter">進度：{curIdx + 1} / {shuffled.length}</span>
            </div>
          </div>
        </div>
        
        <div className="px-4 py-2 bg-slate-900 border border-white/5 rounded-xl shadow-inner">
          <span className="text-slate-500 text-[8px] font-black uppercase tracking-wider block mb-0.5">本尊神識</span>
          <span className="text-indigo-400 text-sm font-black font-mono">
            {user.ancientExp || 0}
          </span>
        </div>
      </header>

      <HandwritingEngine 
        word={shuffled[curIdx].en} 
        zh={shuffled[curIdx].zh} 
        pos={shuffled[curIdx].pos}
        onResult={(ok) => {
          const wordKey = shuffled[curIdx].en;
          const currentHistory = user.stats.wordHistory || {};
          const prev = currentHistory[wordKey] || { c: 0, w: 0 };
          
          const updatedHistory = {
            ...currentHistory,
            [wordKey]: {
              c: prev.c + (ok ? 1 : 0),
              w: prev.w + (ok ? 0 : 1)
            }
          };

          const pts = ok ? 50 : -20; // Correct gets exp, wrong loses a bit of ancient exp

          const updated = { 
            ...user, 
            ancientExp: Math.max(0, (user.ancientExp || 0) + pts),
            stats: {
              ...user.stats,
              wordHistory: updatedHistory
            }
          };
          onUpdate(updated);
          nextWord(); 
        }} 
        onBack={() => setView('lobby')} 
      />
    </div>
  );
}
