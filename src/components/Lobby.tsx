/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { User, AppSettings, Word } from '../types';
import { getRealmInfo, getAncientRealm, getMasteredPrefix, ANCIENT_REALMS } from '../constants';
import { ShieldCheck, Camera, Sword, RotateCcw, Zap, ChevronRight, LogOut, Sparkles, Move, Maximize, X, Check } from 'lucide-react';

interface LobbyProps {
  user: User;
  settings: AppSettings;
  words: Word[];
  setView: (v: any) => void;
  onLogout: () => void;
  onUpdate: (u: User) => void;
}

export default function Lobby({ user, settings, words, setView, onLogout, onUpdate }: LobbyProps) {
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [modal, setModal] = useState<{ type: 'confirm' | 'alert'; msg: string; onConfirm?: () => void } | null>(null);
  const [tempAvatar, setTempAvatar] = useState(user.avatar);
  const [tempSize, setTempSize] = useState(user.avatarSize || 192);
  const [tempX, setTempX] = useState(user.avatarX || 0);
  const [tempY, setTempY] = useState(user.avatarY || 0);

  const masteredCount = Object.values(user.stats.wordStats || {}).filter(score => score >= 50).length;
  const info = getRealmInfo(user.exp);
  const prog = ((user.exp - info.current) / (info.next - info.current)) * 100;
  const ancient = getAncientRealm(user.ancientExp || 0, masteredCount);
  const prefix = getMasteredPrefix(masteredCount);

  const canRebirth = ancient.n === "九星古神";

  const handleRebirth = () => {
    setModal({
      type: 'confirm',
      msg: "確定要涅槃重修嗎？一身修為將歸還天地，但閣下將獲得更高階的修士之證，轉世重啟！",
      onConfirm: () => {
        onUpdate({
          ...user,
          exp: 0,
          ancientExp: 0,
          rotations: (user.rotations || 0) + 1
        });
      }
    });
  };

  const saveAvatar = () => {
    onUpdate({
      ...user,
      avatar: tempAvatar,
      avatarSize: tempSize,
      avatarX: tempX,
      avatarY: tempY
    });
    setIsEditingAvatar(false);
  };

  useEffect(() => {
    const today = new Date().toDateString();
    if (user.stats.lastDate !== today) {
      const updated = {
        ...user,
        stats: {
          ...user.stats,
          rounds: 0,
          spirit: 0,
          lastDate: today
        }
      };
      onUpdate(updated);
    }
  }, []);

  return (
    <div className="p-6 flex flex-col h-screen space-y-6 pb-24 overflow-y-auto scrollbar-hide relative">
      {/* Custom Modal */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60 animate-in fade-in duration-200">
          <div className="w-full max-w-xs glass border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl text-center">
            <div className="flex justify-center">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400">
                    <Sparkles size={24} />
                </div>
            </div>
            <p className="text-slate-300 text-sm font-bold leading-relaxed">{modal.msg}</p>
            <div className="flex gap-3">
                <button 
                  onClick={() => {
                    modal.onConfirm?.();
                    setModal(null);
                  }}
                  className="flex-1 bg-indigo-600 py-3 rounded-xl text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all pointer-events-auto"
                >
                  確認
                </button>
                {modal.type === 'confirm' && (
                  <button onClick={() => setModal(null)} className="flex-1 bg-white/5 py-3 rounded-xl text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all pointer-events-auto">
                    取消
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
      {/* Avatar Editor Modal */}
      {isEditingAvatar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
          <div className="glass w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            {/* Header - Fixed */}
            <div className="p-6 flex justify-between items-center border-b border-white/5 bg-white/5">
              <h3 className="text-lg font-black text-white tracking-[0.2em] uppercase">聖像調整</h3>
              <button 
                onClick={() => setIsEditingAvatar(false)} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
              {/* Fixed Circular Viewport Proxy */}
              <div className="relative w-full aspect-square flex items-center justify-center bg-slate-900/50 rounded-2xl border border-white/5">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
                
                {/* The "Mask" Circle */}
                <div className="relative w-48 h-48 rounded-full border-4 border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.3)] overflow-hidden bg-slate-950/80 z-10">
                  <motion.div
                    drag
                    dragMomentum={false}
                    onDragEnd={(_, info) => {
                      setTempX(prev => prev + info.offset.x);
                      setTempY(prev => prev + info.offset.y);
                    }}
                    className="absolute cursor-move active:cursor-grabbing"
                    style={{
                      width: tempSize,
                      height: tempSize,
                      x: tempX,
                      y: tempY,
                      left: '50%',
                      top: '50%',
                      marginLeft: -(tempSize / 2),
                      marginTop: -(tempSize / 2),
                    }}
                  >
                    <img 
                      src={tempAvatar} 
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    {/* Interaction Hint Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 hover:opacity-100 transition-opacity">
                      <Move className="text-white drop-shadow-lg" size={32} />
                    </div>
                  </motion.div>
                </div>

                {/* Perspective Guide */}
                <div className="absolute inset-0 border-2 border-dashed border-white/5 rounded-2xl pointer-events-none scale-95" />
                <div className="absolute bottom-4 text-[9px] font-black text-indigo-400/40 uppercase tracking-[0.2em] pointer-events-none">
                  拖拽內部圖片以對齊聖像
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-6">
                <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                    <div className="flex items-center gap-2"><Maximize size={12} /> 縮放聖圖</div>
                    <span className="bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{Math.floor((tempSize/192)*100)}%</span>
                  </div>
                  <input 
                    type="range" min="40" max="600" value={tempSize} 
                    onChange={(e) => setTempSize(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[8px] text-slate-600 font-bold uppercase">
                    <span>精微</span>
                    <span>廣大</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => document.getElementById('edit-avatar-upload')?.click()}
                    className="p-4 glass rounded-2xl text-[10px] font-black text-slate-400 hover:text-white hover:bg-white/10 transition-all flex flex-col items-center gap-2 group ring-1 ring-white/5"
                  >
                    <div className="p-2 rounded-lg bg-white/5 group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all">
                      <Camera size={18} />
                    </div>
                    更換聖像內容
                  </button>
                  <input 
                    type="file" id="edit-avatar-upload" hidden accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setTempAvatar(ev.target.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <button 
                    onClick={() => { setTempX(0); setTempY(0); setTempSize(192); }}
                    className="p-4 glass rounded-2xl text-[10px] font-black text-slate-400 hover:text-white hover:bg-white/10 transition-all flex flex-col items-center gap-2 group ring-1 ring-white/5"
                  >
                    <div className="p-2 rounded-lg bg-white/5 group-hover:bg-slate-500/20 group-hover:rotate-180 transition-all duration-500">
                      <RotateCcw size={18} />
                    </div>
                    重置位置大小
                  </button>
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="p-4 bg-white/5 border-t border-white/5 flex gap-3">
              <button 
                onClick={() => setIsEditingAvatar(false)} 
                className="flex-1 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors"
              >
                取消不存
              </button>
              <button 
                onClick={saveAvatar} 
                className="flex-[2] py-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-2"
              >
                <Check size={16} /> 烙印聖像
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex justify-between items-start mt-8 mb-4">
        <div className="flex items-center space-x-5">
          <div className="relative group cursor-pointer" onClick={() => {
            setTempAvatar(user.avatar);
            setTempSize(user.avatarSize || 192);
            setTempX(user.avatarX || 0);
            setTempY(user.avatarY || 0);
            setIsEditingAvatar(true);
          }}>
            <div 
              style={{ width: 72, height: 72 }}
              className="rounded-full border-2 border-indigo-500 overflow-hidden shadow-[0_0_20px_rgba(99,102,241,0.3)] relative bg-slate-900"
            >
              <img 
                src={user.avatar} 
                style={{ 
                  width: (user.avatarSize || 192) * (72/192),
                  height: (user.avatarSize || 192) * (72/192),
                  transform: `translate(calc(-50% + ${(user.avatarX || 0) * (72/192)}px), calc(-50% + ${(user.avatarY || 0) * (72/192)}px))`,
                  maxWidth: 'none'
                }}
                className="object-cover hover:brightness-110 transition-all absolute top-1/2 left-1/2" 
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-indigo-600 p-2 rounded-full border-2 border-slate-950 shadow-lg">
              <Camera size={12} className="text-white" />
            </div>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-black text-white flex items-center gap-2 tracking-tight">
              {user.name}
              {(user.rotations || 0) > 0 && (
                <span className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full italic font-black">
                  {user.rotations} 轉
                </span>
              )}
            </h2>
            <div className="flex flex-wrap gap-2">
              <p className={`text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-900/50 border border-white/5 ${info.c}`}>
                {info.s.startsWith(info.m) ? info.s : `${info.m}・${info.s}`}
              </p>
              <p className={`text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-900/50 border border-white/5 ${ancient.c}`}>◆ {prefix}{ancient.n}</p>
            </div>
          </div>
        </div>
        <button onClick={() => setView('admin')} className="p-3.5 glass rounded-xl text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-lg active:scale-90">
          <ShieldCheck size={20} />
        </button>
      </header>

      <div className="glass p-7 rounded-3xl space-y-8 shadow-xl border border-white/5">
        {/* 分身進度 */}
        <div className="space-y-4">
          <div className="flex justify-between items-end text-[10px] font-black tracking-widest text-emerald-500/80 uppercase">
            <span>分身修行 ・ {info.s}</span>
            <span>{user.exp.toLocaleString()} / {info.next.toLocaleString()}</span>
          </div>
          <div className="bar-container h-2 bg-slate-950/50">
            <div className="bar-fill bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" style={{ width: `${Math.min(100, prog)}%` }}></div>
          </div>
          <p className="text-[9px] text-right text-slate-600 font-bold italic tracking-tighter">突破尚需 {info.next - user.exp} 靈氣提升</p>
        </div>

        {/* 本尊進度 */}
        {ancient.n !== "九星古神" && (
          <div className="space-y-8 pt-8 border-t border-white/5 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-slate-900 border border-white/10 rounded-full shadow-lg">
              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.25em] whitespace-nowrap">本尊晉升需達成雙重門檻</p>
            </div>
            {(() => {
              const ancientIdx = ANCIENT_REALMS.findIndex(r => r.n === ancient.n);
              const nextAncient = ANCIENT_REALMS[ancientIdx + 1];
              if (!nextAncient) return null;
              
              const ptsReached = (user.ancientExp || 0) >= nextAncient.pts;
              const masteredReached = masteredCount >= nextAncient.masteredReq;
              const ptsProg = Math.min(100, ((user.ancientExp || 0) / nextAncient.pts) * 100);
              const masterProg = Math.min(100, (masteredCount / (nextAncient.masteredReq || 1)) * 100);

              return (
                <>
                  {/* 神識進度 (經驗值) */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-end text-[10px] font-black tracking-widest uppercase">
                      <span className={ptsReached ? 'text-emerald-400' : 'text-rose-500'}>
                        {ptsReached ? '✓' : '✕'} 神識累積 ・ 目標 {nextAncient.n}
                      </span>
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] text-slate-500">目前 / 目標</span>
                        <span className="text-slate-400">{user.ancientExp || 0} / {nextAncient.pts.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="bar-container h-2 bg-slate-900 border border-white/5">
                      <div className={`bar-fill transition-all duration-1000 ${ptsReached ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)]' : 'bg-slate-700'}`} style={{ width: `${ptsProg}%` }}></div>
                    </div>
                    <p className={`text-[9px] text-right font-black italic tracking-tighter ${ptsReached ? 'text-emerald-500/60' : 'text-rose-500/60'}`}>
                      {ptsReached ? '【神識契合已達標】' : `距離晉升門檻還差 ${Math.max(0, nextAncient.pts - (user.ancientExp || 0))} 點神識`}
                    </p>
                  </div>

                  {/* 刻印進度 (精熟度) */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-end text-[10px] font-black tracking-widest uppercase">
                      <span className={masteredReached ? 'text-emerald-400' : 'text-rose-500'}>
                        {masteredReached ? '✓' : '✕'} 識人刻印 ・ 需熟練度 ≥ 50
                      </span>
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] text-slate-500">已熟練 / 目標數</span>
                        <span className="text-slate-400">{masteredCount} / {nextAncient.masteredReq}</span>
                      </div>
                    </div>
                    <div className="bar-container h-2 bg-slate-900 border border-white/5">
                      <div className={`bar-fill transition-all duration-1000 ${masteredReached ? 'bg-violet-600 shadow-[0_0_15px_rgba(139,92,246,0.6)]' : 'bg-slate-700'}`} style={{ width: `${masterProg}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-black italic tracking-tighter">
                      <span className="text-slate-700">（註：練習單字達 50 分即算熟練）</span>
                      <span className={masteredReached ? 'text-emerald-500/60' : 'text-rose-500/60'}>
                        {masteredReached ? '【刻印圓滿】' : `尚需精熟 ${Math.max(0, nextAncient.masteredReq - masteredCount)} 個字方可突破`}
                      </span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass p-5 rounded text-center border-b-2 border-indigo-500/50">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">今日修道進度</p>
          <p className="text-3xl font-black text-white font-mono">{user.stats.rounds} / {settings.rounds}</p>
        </div>
        <div className="glass p-5 rounded text-center border-b-2 border-slate-700">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">仙凡悟理</p>
          <p className="text-3xl font-black text-indigo-400 font-mono">{user.stats.spirit} 卷</p>
        </div>
      </div>

      <div className="flex-1 space-y-4">
        {words.length === 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center space-y-2">
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">仙冊空虛</p>
              <p className="text-[10px] text-amber-500/70 leading-relaxed">道友，本珠識海中尚無經文。請主宰（點擊右上盾牌）進入「主宰殿」匯入 CSV 經書並點擊「封存法旨」方可開啟試煉。</p>
            </div>
        )}
        
        {canRebirth && (
          <button 
            onClick={handleRebirth}
            className="w-full glass p-5 rounded flex items-center justify-between bg-red-950/20 border-red-500/30 border animate-pulse group hover:bg-red-900/30 transition-all"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-500 text-white rounded shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                <Sparkles size={24} />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-red-400">涅槃重修</h4>
                <p className="text-[10px] text-red-500/80 uppercase tracking-widest">歸零入聖 ・ 二轉啟程</p>
              </div>
            </div>
            <ChevronRight className="text-red-700" />
          </button>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div 
            onClick={() => {
              if (user.stats.rounds >= settings.rounds) {
                setModal({ type: 'alert', msg: "今日道感已圓滿，欲速則不達。請明朝再會！" });
                return;
              }
              setView('trial');
            }} 
            className={`glass p-6 rounded flex flex-col items-center justify-center space-y-4 cursor-pointer transition-all active:scale-95 ${user.stats.rounds >= settings.rounds ? 'opacity-50 grayscale' : 'hover:border-indigo-500 border-transparent border'}`}
          >
            <div className={`w-14 h-14 rounded flex items-center justify-center text-white ${user.stats.rounds >= settings.rounds ? 'bg-slate-800' : 'bg-indigo-600 shadow-lg shadow-indigo-500/20'}`}>
              <Sword size={28} />
            </div>
            <div className="text-center">
              <h3 className="font-black text-white text-lg">本日試煉</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{user.stats.rounds >= settings.rounds ? '靈台已滿' : '神識 · 悟道'}</p>
            </div>
          </div>

          <div 
            onClick={() => setView('reverse_train')} 
            className="glass p-6 rounded flex flex-col items-center justify-center space-y-4 cursor-pointer transition-all active:scale-95 hover:border-indigo-400 border-transparent border"
          >
            <div className="w-14 h-14 bg-slate-800 border border-indigo-500/30 rounded flex items-center justify-center text-indigo-400 shadow-lg">
              <RotateCcw size={28} />
            </div>
            <div className="text-center">
              <h3 className="font-black text-white text-lg">逆練神識</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-tighter">本尊 · 淬鍊</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setView('train')} 
          className="glass p-5 rounded flex items-center justify-between cursor-pointer hover:border-indigo-500/50 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded"><Zap size={24} /></div>
            <div>
              <h4 className="font-bold text-white uppercase tracking-widest">天逆空間</h4>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest">無間修煉 · 修羅場</p>
            </div>
          </div>
          <ChevronRight className="text-slate-700 mr-2" />
        </div>
      </div>

      <button onClick={onLogout} className="w-full text-slate-700 text-[10px] font-black tracking-[0.6em] uppercase py-10 flex items-center justify-center gap-2 hover:text-white transition-colors">
        <LogOut size={14} />
        神魂歸位 (退出)
      </button>
</div>
  );
}
