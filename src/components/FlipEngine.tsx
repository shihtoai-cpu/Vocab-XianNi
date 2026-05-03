/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface FlipEngineProps {
  word: string;
  zh: string;
  pos: string;
  onResult: (ok: boolean, pts: number, time: number) => void;
  onBack: () => void;
}

export default function FlipEngine({ word, zh, pos, onResult, onBack }: FlipEngineProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [flipTime, setFlipTime] = useState(0);
  const [grade, setGrade] = useState<{ label: string; color: string; pts: number } | null>(null);

  useEffect(() => {
    setIsFlipped(false); 
    setGrade(null); 
    setFlipTime(0); 
    setStartTime(Date.now());
  }, [word]);

  const handleFlip = () => {
    if (isFlipped || grade) return;
    setFlipTime((Date.now() - startTime) / 1000);
    setIsFlipped(true);
  };

  const evaluate = (isCorrect: boolean) => {
    if (grade) return; 
    let res = { label: 'C', color: 'text-red-500', pts: -5 };
    if (isCorrect) {
      if (flipTime < 1.5) res = { label: 'SSS', color: 'text-red-600 font-black animate-pulse', pts: 50 };
      else if (flipTime < 3) res = { label: 'SS', color: 'text-orange-500', pts: 30 };
      else if (flipTime < 6) res = { label: 'A', color: 'text-emerald-400', pts: 20 };
      else res = { label: 'B', color: 'text-slate-400', pts: 10 };
    }
    setGrade(res);
    if (res.pts > 0 && res.label === 'SSS') {
        confetti({ particleCount: 50, spread: 30, origin: { y: 0.7 } });
    }
  };

  const handleNext = () => {
    if (!grade) return;
    onResult(grade.pts > 0, grade.pts, flipTime);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-4 w-full p-2 overflow-hidden">
      {grade ? (
        <div className="text-center animate-in zoom-in duration-300 w-full flex flex-col items-center justify-center space-y-4">
          <h2 className="text-8xl font-black font-mono text-white tracking-tighter leading-none">{grade.label}</h2>
          <p className={`text-md font-black uppercase tracking-widest ${grade.color}`}>
            {grade.pts > 0 ? `修為 +${grade.pts} PT` : `受挫 ${grade.pts} PT`}
          </p>
          <button onClick={handleNext} className="btn-gold px-8 py-3 text-lg flex items-center space-x-2">
            <span className="tracking-tighter">感悟下一題</span>
            <ChevronRight />
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm flex flex-col items-center flex-1 justify-center">
          <div 
            onClick={handleFlip} 
            className={`glass rounded-2xl p-6 flex flex-col items-center justify-center w-full min-h-[280px] flex-1 max-h-[400px] transition-all duration-300 cursor-pointer ${isFlipped ? 'border-indigo-500/50' : 'hover:scale-[1.01] border-slate-800'}`}
          >
            {!isFlipped ? (
              <div className="text-center animate-in fade-in flex flex-col items-center">
                <p className="text-slate-600 text-[8px] tracking-[0.4em] mb-4 uppercase font-black">正在感應神理</p>
                <h2 className="text-4xl xs:text-5xl font-black text-white tracking-tighter mb-2">{word}</h2>
                <div className="w-10 h-0.5 bg-slate-800 my-4"></div>
                <p className="mt-4 text-indigo-500 animate-pulse text-[9px] font-black uppercase tracking-widest">點擊參悟真意</p>
              </div>
            ) : (
              <div className="w-full space-y-6 animate-in fade-in flex flex-col items-center">
                <div className="text-center w-full">
                  <h2 className="text-3xl font-black text-slate-500 mb-2 tracking-tighter opacity-50">{word}</h2>
                  <div className="h-px bg-slate-800 w-full my-4"></div>
                  <h3 className="text-4xl font-bold text-white mt-1">{zh}</h3>
                  <div className="mt-4 inline-block px-2 py-0.5 bg-blue-600/20 border border-blue-500/30 rounded text-[10px] font-black text-blue-300 uppercase tracking-widest">
                    {pos}
                  </div>
                </div>
                <div className="flex space-x-3 w-full mt-auto">
                  <button onClick={(e) => { e.stopPropagation(); evaluate(false); }} className="flex-1 py-4 rounded-xl bg-red-950/20 border border-red-500/20 text-red-500 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">晦澀</button>
                  <button onClick={(e) => { e.stopPropagation(); evaluate(true); }} className="flex-1 py-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">通達</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
