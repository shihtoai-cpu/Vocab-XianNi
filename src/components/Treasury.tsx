/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Word, User, AppSettings, Batch } from '../types';
import { Swords, Edit2, Trash2, X, Save } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface TreasuryProps {
  words: Word[];
  user: User;
  settings: AppSettings;
  persistChanges: (changes: { words?: Word[]; batches?: Batch[]; settings?: AppSettings }) => Promise<void>;
}

export default function Treasury({ words, user, settings, persistChanges }: TreasuryProps) {
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [editForm, setEditForm] = useState<Partial<Word>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [adminPwInput, setAdminPwInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startEdit = (w: Word) => {
    setEditingWord(w);
    setEditForm({ ...w });
    setAdminPwInput("");
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (!editingWord || !editForm.en || !editForm.zh) return;

    if (adminPwInput.trim() !== settings.adminPw) {
      setErrorMessage("主宰印信（密碼）有誤，法旨難成！");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    const newWords = words.map(w => w.en === editingWord.en ? { ...w, ...editForm } as Word : w);
    
    try {
      await persistChanges({ words: newWords });
      setEditingWord(null);
    } catch (err) {
      console.error(err);
      setErrorMessage("天道（數據庫）混亂，法旨傳達失敗。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingWord) return;
    
    if (adminPwInput.trim() !== settings.adminPw) {
      setErrorMessage("印信不符！凡人豈敢隨意焚毀仙卷。");
      return;
    }

    if (!confirm(`確定要將經文「${editingWord.en}」永久焚毀？此舉不可逆轉。`)) return;

    setIsSaving(true);
    setErrorMessage(null);
    const newWords = words.filter(w => w.en !== editingWord.en);
    
    try {
      await persistChanges({ words: newWords });
      setEditingWord(null);
    } catch (err) {
      console.error(err);
      setErrorMessage("焚毀失敗，通天塔受阻。");
    } finally {
      setIsSaving(false);
    }
  };

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
            <div 
              key={i} 
              onClick={() => startEdit(w)}
              className={`p-4 rounded relative overflow-hidden border transition-all duration-300 group cursor-pointer ${statusColorClass} ${isMastered ? 'ring-1 ring-indigo-500/20' : ''}`}
            >
              {isMastered && (
                <div className="absolute top-0 right-0 bg-indigo-600/80 backdrop-blur-sm text-white text-[7px] px-1.5 py-0.5 font-black uppercase tracking-tighter">
                  精
                </div>
              )}
              
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit2 className="w-3 h-3 text-slate-500 hover:text-white" />
              </div>

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

      {/* Edit Modal */}
      {editingWord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 pb-24">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isSaving && setEditingWord(null)} />
          <div className="relative w-full max-w-sm glass border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">磨礪經文</h3>
                <button onClick={() => setEditingWord(null)} className="text-slate-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">英文真意</label>
                  <input 
                    type="text" 
                    value={editForm.en} 
                    onChange={e => setEditForm({...editForm, en: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">中文語義</label>
                  <input 
                    type="text" 
                    value={editForm.zh} 
                    onChange={e => setEditForm({...editForm, zh: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">詞性 (n/v/adj/...)</label>
                  <input 
                    type="text" 
                    value={editForm.pos} 
                    onChange={e => setEditForm({...editForm, pos: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <label className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest flex justify-between">
                    <span>主宰印信（管理員密碼）</span>
                  </label>
                  <input 
                    type="password" 
                    placeholder="輸入密碼以施行法旨"
                    value={adminPwInput} 
                    onChange={e => setAdminPwInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-800"
                  />
                  {errorMessage && <p className="text-[10px] text-red-500 font-black animate-pulse mt-1">{errorMessage}</p>}
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button 
                  disabled={isSaving}
                  onClick={handleSave}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>封存變更</span>
                </button>
                <button 
                  disabled={isSaving}
                  onClick={handleDelete}
                  className="w-full bg-red-950/20 border border-red-900/30 text-red-500 font-bold py-3 rounded-lg flex items-center justify-center space-x-2 transition-all hover:bg-red-950/40"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>焚毀此卷</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {words.length === 0 && (
        <div className="text-center py-20 text-slate-600 italic">
          目前閣中空無一物，請主宰前往主宰殿匯入經書。
        </div>
      )}
    </div>
  );
}
