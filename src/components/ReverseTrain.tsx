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
  const [overlay, setOverlay] = useState<{ msg: string; type: 'fail' } | null>(null);

  useEffect(() => {
    if (user.shen < 1) {
       setOverlay({ msg: "神識枯竭，無法逆練魂珠！請服用養神丹或閉關。", type: 'fail' });
       setTimeout(() => setView('lobby'), 3000);
       return;
    }
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

  if (!shuffled || shuffled.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">感應逆練空間...</p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <header className="px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <button 
            onClick={prevWord}
            disabled={curIdx === 0}
            className={`p-1.5 transition-all rounded bg-white/5 ${curIdx === 0 ? 'opacity-20 cursor-not-allowed' : 'opacity-60 hover:opacity-100 text-indigo-400 active:scale-90'}`}
          >
            <RotateCcw size={14} />
          </button>
          <div className="flex flex-col">
            <span className="text-indigo-400 font-black text-[10px] tracking-widest uppercase leading-none">逆練神識</span>
            <span className="text-slate-500 font-mono text-[9px] tracking-tighter">圓滿度：{curIdx + 1} / {shuffled.length}</span>
          </div>
        </div>
        
        <div className="px-3 py-1 bg-slate-950/40 border border-white/5 rounded-lg">
          <span className="text-indigo-400 text-xs font-black font-mono leading-none">
            {user.totalAncientExp}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-hidden px-4 pb-4">
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

            const pts = ok ? 50 : -20; 

            const updated = { 
              ...user, 
              shen: Math.max(0, user.shen - 1), // 每題消耗 1 點神識
              totalAncientExp: user.totalAncientExp + (ok ? 10 : 0), // 獲取神識經驗
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
    </div>
  );
}
