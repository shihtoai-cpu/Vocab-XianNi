/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Word, User } from '../types';
import { Swords } from 'lucide-react';

interface TreasuryProps {
  words: Word[];
  user: User;
}

export default function Treasury({ words, user }: TreasuryProps) {
  return (
    <div className="p-6 space-y-6 overflow-y-auto pb-32 h-screen scrollbar-hide">
      <div className="flex justify-between items-end py-4">
        <div>
          <h2 className="text-3xl font-bold text-white">萬寶閣</h2>
          <p className="text-[10px] text-slate-500 tracking-[0.3em] font-bold uppercase">目前收納經文: {words.length} 卷</p>
        </div>
        <Swords className="text-indigo-500 w-8 h-8 opacity-50" />
      </div>

      {/* 顏色說明圖例 */}
      <div className="flex flex-wrap gap-3 pb-2 border-b border-white/5">
        <div className="flex items-center space-x-1.5 grayscale-[0.5]">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-slate-500 font-bold">已參透</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-[10px] text-slate-500 font-bold">曾遺失</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[10px] text-slate-500 font-bold">未成功</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-[10px] text-slate-500 font-bold">待修行</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {words.map((w, i) => {
          const stats = user.stats.wordHistory?.[w.en] || { c: 0, w: 0 };
          const isMastered = (user.stats.wordStats?.[w.en] || 0) >= 50; 
          
          let statusColorClass = "border-slate-800 bg-slate-900/40";
          let textColor = "text-slate-500";
          
          if (stats.c > 0 && stats.w === 0) {
            statusColorClass = "border-emerald-500/50 bg-emerald-500/10 shadow-[inner_0_0_10px_rgba(16,185,129,0.1)]";
            textColor = "text-emerald-400";
          } else if (stats.c > 0 && stats.w > 0) {
            statusColorClass = "border-amber-500/50 bg-amber-500/10 shadow-[inner_0_0_10px_rgba(245,158,11,0.1)]";
            textColor = "text-amber-400";
          } else if (stats.w > 0 && stats.c === 0) {
            statusColorClass = "border-red-500/50 bg-red-500/10 shadow-[inner_0_0_10px_rgba(239,68,68,0.1)]";
            textColor = "text-red-400";
          } else {
            statusColorClass = "border-slate-800 bg-slate-900/60";
            textColor = "text-slate-500";
          }

          return (
            <div key={i} className={`p-4 rounded relative overflow-hidden border transition-all duration-300 ${statusColorClass} ${isMastered ? 'ring-1 ring-indigo-500/20' : ''}`}>
              {isMastered && (
                <div className="absolute top-0 right-0 bg-indigo-600/80 backdrop-blur-sm text-white text-[7px] px-1.5 py-0.5 font-black uppercase tracking-tighter">
                  精
                </div>
              )}
              <h4 className={`font-bold text-base tracking-tight ${stats.c > 0 || stats.w > 0 ? 'text-white' : 'text-slate-500'}`}>{w.en}</h4>
              <p className={`text-[10px] tracking-tighter mt-0.5 font-medium ${textColor}`}>{w.zh}</p>
              
              {(stats.c > 0 || stats.w > 0) && (
                <div className="mt-2.5 flex items-center space-x-2 text-[7px] font-black tracking-widest uppercase opacity-60">
                  <span className="text-emerald-400">通 {stats.c}</span>
                  <div className="w-px h-1.5 bg-slate-800" />
                  <span className="text-red-400">忘 {stats.w}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {words.length === 0 && (
        <div className="text-center py-20 text-slate-600 italic">
          目前閣中空無一物，請主宰匯入經書。
        </div>
      )}
    </div>
  );
}
