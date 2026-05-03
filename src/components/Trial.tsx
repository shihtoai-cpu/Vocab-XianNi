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
  const [overlay, setOverlay] = useState<{ msg: string; type: 'success' | 'fail' | 'info' } | null>(null);

  useEffect(() => {
    if (words.length === 0) return;
    
    // Stamina Check
    if (user.jing < 1) {
       setOverlay({ msg: "精元耗盡，強行修煉恐遭反噬！請服用氣血丹或閉關。", type: 'fail' });
       setTimeout(() => setView('lobby'), 3000);
       return;
    }

    if (words.length < 5) { 
      setOverlay({ msg: "仙冊經書不足 (少於 5 卷)，法陣無法開啟！", type: 'info' });
      setTimeout(() => setView('lobby'), 3000);
      return; 
    }

    const stats = user.stats.wordStats || {};
    const sortedByNeeds = [...words].sort((a, b) => {
      const scoreA = stats[a.en] || 0;
      const scoreB = stats[b.en] || 0;
      return (scoreA - scoreB) + (Math.random() * 20 - 10);
    });

    const picked = sortedByNeeds.slice(0, settings.questions);
    setQ([...picked].sort(() => 0.5 - Math.random()));
  }, [words, settings.questions]);

  const [combo, setCombo] = useState(0);

  const handleTrialResult = (ok: boolean, pts: number) => {
    const wordKey = q[idx].en;
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

    // Item drop logic
    const newCombo = ok ? combo + 1 : 0;
    setCombo(newCombo);
    
    let items = user.items || { bloodPill: 0, qiPill: 0, spiritPill: 0, spiritJade: 0 };
    if (newCombo > 0 && newCombo % 10 === 0) {
       // 10 combo! Drop a random pill
       const rand = Math.random();
       if (rand < 0.33) items.bloodPill++;
       else if (rand < 0.66) items.qiPill++;
       else items.spiritPill++;
       setOverlay({ msg: "機緣！達成 10 連對，獲得一枚丹藥。", type: 'success' });
       setTimeout(() => setOverlay(null), 1500);
    }

    const updatedUser = {
      ...user,
      jing: Math.max(0, user.jing - 1), // 每答一題消耗 1 點精元
      totalExp: user.totalExp + pts, // 永久累積累積修為
      totalAncientExp: user.totalAncientExp + (ok ? 1 : 0), // 額外補助一星神識
      items,
      stats: {
        ...user.stats,
        wordStats: { ...currentWordStats, [wordKey]: newWordScore },
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
        setOverlay({ msg: "此輪試煉圓滿！神識更進一步。", type: 'success' });
        setTimeout(() => finish(true, updatedUser), 2000);
      } else if (currentErrs.length <= settings.errors && !res) {
        setOverlay({ msg: `神識受損！開啟重修陣`, type: 'info' });
        setTimeout(() => {
          setOverlay(null);
          setRes(true); 
          setQ([...currentErrs]); 
          setErrs([]); 
          setIdx(0);
          onUpdate(updatedUser);
        }, 2000);
      } else {
        setOverlay({ msg: "道心受挫，此次試煉終止！", type: 'fail' });
        setTimeout(() => finish(false, updatedUser), 2000);
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
    <div className="flex-1 flex flex-col items-center justify-center space-y-4 bg-slate-950/20 relative">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">感應法陣中...</p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {overlay && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center p-8 backdrop-blur-md bg-black/60 animate-in fade-in duration-300">
          <div className={`p-8 rounded-3xl border text-center space-y-4 shadow-2xl max-w-sm ${
            overlay.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400' :
            overlay.type === 'fail' ? 'bg-red-950/40 border-red-500/50 text-red-500' :
            'bg-indigo-950/40 border-indigo-500/50 text-indigo-400'
          }`}>
            <h3 className="text-xl font-black uppercase tracking-widest">
              {overlay.type === 'success' ? '試煉圓滿' : overlay.type === 'fail' ? '道心受阻' : '靈識波動'}
            </h3>
            <p className="text-sm font-bold leading-relaxed">{overlay.msg}</p>
          </div>
        </div>
      )}

      {/* Compact Progress Header */}
      <header className="px-4 py-3 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">試煉進度</span>
          <span className="text-xs font-mono font-bold text-slate-300">{idx + 1} / {q.length}</span>
        </div>
        
        {res && (
          <span className="bg-red-600/20 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-[8px] font-black animate-pulse uppercase tracking-widest">
            敗部重修
          </span>
        )}

        <div className="flex gap-1">
          {q.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all duration-300 ${
                i < idx ? 'w-2 bg-emerald-500/40' : 
                i === idx ? 'w-4 bg-indigo-500' : 
                'w-1 bg-slate-800'
              }`} 
            />
          ))}
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden px-4 pb-4">
        <FlipEngine 
          word={q[idx].en} 
          zh={q[idx].zh} 
          pos={q[idx].pos} 
          onResult={handleTrialResult} 
          onBack={() => { onUpdate(user); setView('lobby'); }} 
        />
      </div>
    </div>
  );
}
