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
      else if (flipTime < 3) res = { label: 'S', color: 'text-orange-500', pts: 30 };
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
    <div className="flex-1 flex flex-col items-center justify-center space-y-10 w-full p-4">
      {grade ? (
        <div className="text-center animate-in zoom-in duration-300 w-full flex flex-col items-center justify-center space-y-8">
          <h2 className="text-9xl font-black font-mono text-white tracking-tighter">{grade.label}</h2>
          <p className={`text-lg font-black uppercase tracking-widest ${grade.color}`}>
            {grade.pts > 0 ? `修為 +${grade.pts} PT` : `受挫 ${grade.pts} PT`}
          </p>
          <button onClick={handleNext} className="btn-gold px-12 py-4 text-xl flex items-center space-x-2">
            <span className="tracking-tighter">感悟下一題</span>
            <ChevronRight />
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-8">
          <div 
            onClick={handleFlip} 
            className={`glass rounded p-12 flex flex-col items-center justify-center min-h-[350px] transition-all duration-300 cursor-pointer ${isFlipped ? 'border-indigo-500/50' : 'hover:scale-[1.02] border-slate-800'}`}
          >
            {!isFlipped ? (
              <div className="text-center animate-in fade-in">
                <p className="text-slate-600 text-[10px] tracking-[0.4em] mb-6 uppercase font-bold">正在感應神理</p>
                <h2 className="text-5xl font-black text-white tracking-tighter mb-4">{word}</h2>
                <div className="w-12 h-1 bg-slate-800 mx-auto my-8"></div>
                <p className="mt-4 text-indigo-500 animate-pulse text-[10px] font-bold uppercase tracking-widest">點擊參悟真意</p>
              </div>
            ) : (
              <div className="w-full space-y-8 animate-in fade-in">
                <div className="text-center">
                  <h2 className="text-5xl font-black text-slate-500 mb-4 tracking-tighter opacity-50">{word}</h2>
                  <div className="inline-block px-2 py-0.5 bg-blue-600/30 border border-blue-500/40 rounded text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">
                    {pos}
                  </div>
                  <div className="h-px bg-slate-800 w-full my-6"></div>
                  <h3 className="text-3xl font-bold text-white mt-2">{zh}</h3>
                </div>
                <div className="flex space-x-4 w-full">
                  <button onClick={(e) => { e.stopPropagation(); evaluate(false); }} className="flex-1 py-5 rounded bg-red-950/20 border border-red-500/30 text-red-500 font-black text-xs uppercase tracking-widest">遺忘</button>
                  <button onClick={(e) => { e.stopPropagation(); evaluate(true); }} className="flex-1 py-5 rounded bg-indigo-950/20 border border-indigo-500/30 text-indigo-400 font-black text-xs uppercase tracking-widest">通曉</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
