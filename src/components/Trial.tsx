/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User, AppSettings, Word } from '../types';
import FlipEngine from './FlipEngine';
import confetti from 'canvas-confetti';
import { ChevronLeft } from 'lucide-react';

interface TrialProps {
  user: User;
  settings: AppSettings;
  words: Word[];
  onUpdate: (u: User) => void;
  setView: (v: any) => void;
}

export default function Trial({ user, settings, words, onUpdate, setView }: TrialProps) {
  const [idx, setIdx] = useState(0); 
  const [q, setQ] = useState<Word[]>([]); 
  const [errs, setErrs] = useState<Word[]>([]); 
  const [res, setRes] = useState(false);

  useEffect(() => {
    if (words.length < 5) { 
      alert("仙冊不足 (少於 5 卷)，無法開啟試煉！"); 
      setView('lobby'); 
      return; 
    }

    // Weight-based selection: prioritize words with lower mastery
    const stats = user.stats.wordStats || {};
    const sortedByNeeds = [...words].sort((a, b) => {
      const scoreA = stats[a.en] || 0;
      const scoreB = stats[b.en] || 0;
      // Lower score (less mastered) comes first
      // Add a bit of randomness to avoid same list every time
      return (scoreA - scoreB) + (Math.random() * 20 - 10);
    });

    const picked = sortedByNeeds.slice(0, settings.questions);
    // Shuffle the picked list so it's not strictly ordered by difficulty
    setQ([...picked].sort(() => 0.5 - Math.random()));
  }, [words, settings.questions, setView, user.stats.wordStats]);

  const handleTrialResult = (ok: boolean, pts: number) => {
    const wordKey = q[idx].en;
    const currentWordStats = user.stats.wordStats || {};
    const oldScore = currentWordStats[wordKey] || 0;
    
    // Mastery algorithm:
    // Success adds speed-based points (1-10).
    // Failure cuts score significantly to force review.
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

    const updatedUser = {
      ...user,
      exp: user.exp + pts,
      stats: {
        ...user.stats,
        wordStats: {
          ...currentWordStats,
          [wordKey]: newWordScore
        },
        wordHistory: updatedHistory
      }
    };

    const currentErrs = !ok ? [...errs, q[idx]] : errs;
    if (!ok) setErrs(currentErrs);

    if (idx + 1 < q.length) {
      setIdx(idx + 1);
      onUpdate(updatedUser);
    } else {
      if (currentErrs.length === 0) {
        alert("此輪感悟圓滿！神識更進一步。");
        finish(true, updatedUser);
      } else if (currentErrs.length <= settings.errors && !res) {
        alert(`神識受損！開啟敗部復活重修 (共 ${currentErrs.length} 題)`);
        setRes(true); 
        setQ([...currentErrs]); 
        setErrs([]); 
        setIdx(0);
        onUpdate(updatedUser); // Still update user stats
      } else {
        alert("道心受挫，今日試煉終止！");
        finish(false, updatedUser);
      }
    }
  };

  const finish = (isPerfect: boolean, finalUser: User) => {
    const resultUser = {
      ...finalUser,
      stats: { ...finalUser.stats, rounds: finalUser.stats.rounds + 1 }
    };
    onUpdate(resultUser);
    if (isPerfect) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    setView('lobby');
  };

  if (!q[idx]) return (
    <div className="p-10 text-center flex flex-col items-center justify-center h-screen space-y-4">
      <p className="text-slate-500 italic">正在感應試煉內容...</p>
      {words.length === 0 && (
        <button onClick={() => setView('lobby')} className="px-6 py-3 glass rounded-xl text-indigo-400">
          暫回洞府
        </button>
      )}
    </div>
  );

  return (
    <div className="p-6 h-screen flex flex-col overflow-hidden bg-slate-950">
      <header className="flex justify-between items-start mt-12 mb-8 px-2">
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => { onUpdate(user); setView('lobby'); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 group border border-white/5 shadow-xl"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black tracking-widest uppercase">儲存修為並遁走</span>
          </button>
          
          <div className="flex flex-col pl-2">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">今日試煉</span>
            <span className="text-[9px] text-slate-600 font-mono tracking-tighter">進度：{idx + 1} / {q.length}</span>
          </div>
        </div>
        
        {res ? (
          <span className="bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-[9px] font-black animate-pulse uppercase tracking-widest">
            敗部復活
          </span>
        ) : (
          <div className="flex gap-1.5">
            {q.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all duration-500 ${
                  i < idx ? 'w-3 bg-emerald-500/50' : 
                  i === idx ? 'w-6 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 
                  'w-1.5 bg-slate-800'
                }`} 
              />
            ))}
          </div>
        )}
      </header>
      <FlipEngine 
        word={q[idx].en} 
        zh={q[idx].zh} 
        pos={q[idx].pos} 
        onResult={handleTrialResult} 
        onBack={() => { onUpdate(user); setView('lobby'); }} 
      />
    </div>
  );
}
