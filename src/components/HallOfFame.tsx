/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from '../types';
import { getRealmInfo, getAncientRealm, getMasteredPrefix } from '../constants';
import { Trophy } from 'lucide-react';

interface HallOfFameProps {
  users: User[];
}

export default function HallOfFame({ users }: HallOfFameProps) {
  const sorted = [...users].sort((a, b) => 
    ((b.totalExp || 0) + (b.totalAncientExp || 0)) - ((a.totalExp || 0) + (a.totalAncientExp || 0))
  );
  
  return (
    <div className="p-6 space-y-6 overflow-y-auto pb-32 h-screen scrollbar-hide">
      <div className="flex flex-col items-center justify-center py-4 space-y-2">
        <Trophy className="text-indigo-500 w-10 h-10" />
        <h2 className="text-3xl font-calligraphy text-white text-center">封神碑</h2>
      </div>
      <div className="space-y-4">
        {sorted.map((u, i) => {
          const tao = getRealmInfo(u.totalExp || 0);
          const masteredCount = Object.values(u.stats.wordStats || {}).filter(score => score >= 50).length;
          const ancient = getAncientRealm(u.totalAncientExp || 0, masteredCount);
          const prefix = getMasteredPrefix(masteredCount);

          return (
            <div key={i} className="glass p-5 rounded border-l-4 border-indigo-500 flex items-center space-x-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-5">
                <span className="text-4xl font-bold font-mono">#{i + 1}</span>
              </div>
              <div className="w-12 h-12 rounded border-2 border-slate-800 overflow-hidden relative bg-slate-900 shrink-0">
                <img 
                  src={u.avatar} 
                  style={{ 
                    width: (u.avatarSize || 192) * (48/192),
                    height: (u.avatarSize || 192) * (48/192),
                    transform: `translate(calc(-50% + ${(u.avatarX || 0) * (48/192)}px), calc(-50% + ${(u.avatarY || 0) * (48/192)}px))`,
                    maxWidth: 'none'
                  }}
                  className="object-cover absolute top-1/2 left-1/2" 
                />
              </div>
              <div className="flex-1 z-10">
                <h4 className="font-bold text-white text-lg flex items-center gap-2">
                  {u.name}
                  {(u.rotations || 0) > 0 && (
                    <span className="text-[9px] bg-red-600/20 text-red-400 border border-red-500/30 px-1 py-0.5 rounded font-black">
                      {u.rotations}轉
                    </span>
                  )}
                </h4>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded bg-slate-800 ${tao.c}`}>
                    {tao.s.startsWith(tao.m) ? tao.s : `${tao.m} · ${tao.s}`}
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded bg-indigo-500/10 ${ancient.c}`}>
                    ◆ {prefix}{ancient.n}
                  </span>
                </div>
              </div>
              <div className="text-right z-10">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">總修為</p>
                <p className="text-sm font-mono font-bold text-white">{((u.totalExp || 0) + (u.totalAncientExp || 0)).toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
