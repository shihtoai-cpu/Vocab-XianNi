/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, ChangeEvent } from 'react';
import { AppSettings, Word, Batch, User } from '../types';
import { db } from '../lib/firebase';
import { doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { autoCategorize } from '../constants';
import { ShieldCheck, X, Save, Camera } from 'lucide-react';

interface AdminProps {
  settings: AppSettings;
  words: Word[];
  batches: Batch[];
  users: User[];
  persistGlobal: (changes: { words?: Word[]; batches?: Batch[]; settings?: AppSettings }) => Promise<void>;
  setUsers: (u: User[]) => void;
  setView: (v: any) => void;
  curUser: User | null;
  setCurUser: (u: User) => void;
}

export default function Admin({ settings: initialSettings, words: initialWords, batches: initialBatches, users: initialUsers, persistGlobal, setUsers: persistUsers, setView, curUser, setCurUser }: AdminProps) {
  const [auth, setAuth] = useState(false);
  const [pw, setPw] = useState("");

  const [saving, setSaving] = useState(false);
  
  // Local draft state to avoid race conditions and stale closures
  const [localWords, setLocalWords] = useState<Word[]>(initialWords || []);
  const [localBatches, setLocalBatches] = useState<Batch[]>(initialBatches || []);
  const [localSettings, setLocalSettings] = useState<AppSettings>(initialSettings);
  const [localUsers, setLocalUsers] = useState<User[]>(initialUsers || []);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const handleCSV = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      const content = ev.target?.result as string;
      const lines = content.split('\n').filter(l => l.trim());
      const bid = Date.now();
      const news = lines.map(line => {
        const p = line.split(',');
        if (p.length < 3) return null;
        const en = p[0].trim();
        const pos = p[1].trim();
        const zh = p[2].trim();
        return { en, pos, zh, cat: autoCategorize(zh), bid };
      }).filter((x): x is Word => x !== null);

      const nw = [...localWords];
      news.forEach(n => {
        const i = nw.findIndex(w => w.en.toLowerCase() === n.en.toLowerCase());
        if (i !== -1) { 
          if(!nw[i].zh.includes(n.zh)) nw[i].zh += `; ${n.zh}`; 
        } else {
          nw.push(n);
        }
      });

      setLocalWords(nw);
      const newBatches = [...localBatches, { id: bid, d: new Date().toLocaleString(), c: news.length }];
      setLocalBatches(newBatches);
      alert("仙冊經文匯入成功！記得後續點擊『封存法旨』以確保存檔。");
    };
    r.readAsText(f);
  };

  if (!auth) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-screen space-y-6 animate-in zoom-in">
      <ShieldCheck className="w-16 h-16 text-indigo-500" />
      <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">主宰禁制</h2>
      <input 
        type="password" 
        placeholder="請輸入主宰密碼" 
        className="w-full bg-slate-950 border border-slate-800 p-4 rounded text-center focus:border-indigo-500 outline-none text-2xl text-white font-mono" 
        value={pw} 
        onChange={e => setPw(e.target.value)} 
        onKeyUp={e => e.key === 'Enter' && (pw === localSettings.adminPw ? setAuth(true) : alert("密碼錯誤"))} 
      />
      <button onClick={() => pw === localSettings.adminPw ? setAuth(true) : alert("密碼錯誤")} className="w-full py-4 btn-gold text-lg tracking-widest">解開禁制</button>
      <button onClick={() => setView('lobby')} className="text-slate-600 font-bold text-[10px] uppercase tracking-[0.5em]">返回洞府</button>
    </div>
  );

  return (
    <div className="p-6 flex flex-col space-y-8 overflow-y-auto h-screen pb-24 scrollbar-hide">
      <div className="flex justify-between items-center mt-4">
        <h2 className="text-xl font-bold text-white tracking-tight uppercase">主宰殿 <span className="text-[10px] text-indigo-500 font-mono">SOVEREIGN_PALACE</span></h2>
        <button onClick={() => setView('lobby')} className="p-2 glass rounded text-slate-500 hover:text-white"><X size={18} /></button>
      </div>
      
      <section className="glass p-6 rounded space-y-4 border-t-2 border-indigo-500">
        <h3 className="text-[10px] font-black text-indigo-400 border-b border-slate-800 pb-2 uppercase tracking-widest">天道法則設定</h3>
        <div className="space-y-4 text-[10px]">
          <div className="flex justify-between items-center"><span>挑戰輪次: {localSettings.rounds}</span><input type="range" min="3" max="10" value={localSettings.rounds} onChange={e => setLocalSettings({...localSettings, rounds: parseInt(e.target.value)})} className="w-24 accent-indigo-500" /></div>
          <div className="flex justify-between items-center"><span>每輪題數: {localSettings.questions}</span><input type="range" min="5" max="20" value={localSettings.questions} onChange={e => setLocalSettings({...localSettings, questions: parseInt(e.target.value)})} className="w-24 accent-indigo-500" /></div>
          <div className="flex justify-between items-center"><span>復活容錯: {localSettings.errors}</span><input type="range" min="0" max="10" value={localSettings.errors} onChange={e => setLocalSettings({...localSettings, errors: parseInt(e.target.value)})} className="w-24 accent-indigo-500" /></div>
          <div className="pt-2 border-t border-slate-800">
            <span className="text-slate-600 uppercase font-bold text-[9px] tracking-widest">修改主宰密碼:</span>
            <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded mt-1 p-2 text-center text-indigo-400 font-bold font-mono" value={localSettings.adminPw} onChange={e => setLocalSettings({...localSettings, adminPw: e.target.value})} />
          </div>
        </div>
      </section>

      <section className="glass p-6 rounded space-y-4">
        <h3 className="text-[10px] font-black text-slate-500 border-b border-slate-800 pb-2 uppercase tracking-widest">修士名錄維護</h3>
        <div className="space-y-4">
          {localUsers.map((u, i) => (
            <div key={u.id || i} className="bg-slate-900 p-4 rounded border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center space-x-4">
                <div className="relative group">
                  <img 
                    src={u.avatar} 
                    className="w-14 h-14 rounded border-2 border-indigo-500 object-cover cursor-pointer hover:brightness-125 transition-all" 
                    onClick={() => document.getElementById(`avatar-upload-${i}`)?.click()}
                  />
                  <input 
                    type="file" 
                    id={`avatar-upload-${i}`} 
                    hidden 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                          const dataUrl = ev.target?.result as string;
                          if (u.id) {
                            const userRef = doc(db, 'users', u.id);
                            await updateDoc(userRef, { avatar: dataUrl });
                          }
                          const newList = [...localUsers];
                          newList[i].avatar = dataUrl;
                          setLocalUsers(newList);
                          persistUsers(newList);
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white uppercase tracking-tight">{u.name}</p>
                  <p className="text-[9px] text-slate-500 font-mono">UID: {u.id?.slice(0, 8)}... | EXP: {u.exp}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button onClick={async () => {
                  const e = prompt("調整修士積分", u.exp.toString());
                  if (e !== null && u.id) {
                    const newExp = parseInt(e);
                    await updateDoc(doc(db, 'users', u.id), { exp: newExp });
                    const newList = localUsers.map(x => x.id === u.id ? {...x, exp: newExp} : x);
                    setLocalUsers(newList);
                    persistUsers(newList);
                  }
                }} className="text-[9px] bg-slate-950 p-2 rounded border border-slate-800 text-slate-500 font-bold uppercase hover:text-white">調整修為</button>

                <button onClick={async () => {
                  if (u.id && confirm(`確定要將修士 ${u.name} 逐出仙門？`)) {
                    await deleteDoc(doc(db, 'users', u.id));
                    const newList = localUsers.filter(x => x.id !== u.id);
                    setLocalUsers(newList);
                    persistUsers(newList);
                  }
                }} className="text-[9px] bg-red-950/20 text-red-500 p-2 rounded border border-red-900/30 font-bold uppercase">逐出仙門</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass p-6 rounded space-y-4">
        <h3 className="text-[10px] font-black text-emerald-500 border-b border-slate-800 pb-2 uppercase tracking-widest flex justify-between items-center">
          <span>經書資料匯入</span>
          {!confirmDeleteAll ? (
            <button 
              onClick={() => setConfirmDeleteAll(true)}
              className="text-red-500 hover:text-red-400 font-bold transition-colors"
            >
              焚毀全卷
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-[9px] text-red-500 animate-pulse font-bold">確定焚毀？</span>
              <button 
                onClick={async () => {
                  if (!confirm("確定要將所有經文焚毀？此舉將令萬寶閣徹底清空。")) return;
                  
                  setSaving(true);
                  try {
                    await persistGlobal({ words: [], batches: [] });
                    setLocalWords([]);
                    setLocalBatches([]);
                    setConfirmDeleteAll(false);
                    alert("萬物皆空，仙冊已焚。");
                  } catch (err) {
                    alert("天道崩塌（同步失敗）。");
                  } finally {
                    setSaving(false);
                  }
                }}
                className="bg-red-600 px-2 py-0.5 rounded text-white text-[9px] font-bold"
              >
                確認
              </button>
              <button 
                onClick={() => setConfirmDeleteAll(false)}
                className="text-slate-500 text-[9px] font-bold"
              >
                取消
              </button>
            </div>
          )}
        </h3>
        <input type="file" accept=".csv" onChange={handleCSV} className="text-[9px] w-full file:bg-slate-800 file:border-none file:px-3 file:py-1 file:rounded file:text-slate-400 file:font-bold border border-slate-800 p-2 rounded" />
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {localBatches.map(b => (
            <div key={b.id} className="flex justify-between items-center text-[9px] bg-slate-950/50 p-2 rounded border border-slate-900">
              <span className="text-slate-400 font-mono tracking-tighter">{b.d} <span className="text-white">({b.c}卷)</span></span>
              {confirmDeleteId !== b.id ? (
                <button 
                  onClick={() => setConfirmDeleteId(b.id)} 
                  className="text-red-600 px-2 font-bold hover:text-red-400 transition-colors"
                >
                  焚毀
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={async () => {
                      if (!confirm(`確定要將此卷「${b.d}」永久焚毀？`)) return;
                      
                      const newWords = localWords.filter(w => w.bid !== b.id);
                      const newBatches = localBatches.filter(x => x.id !== b.id);
                      
                      setSaving(true);
                      try {
                        await persistGlobal({ words: newWords, batches: newBatches });
                        setLocalWords(newWords);
                        setLocalBatches(newBatches);
                        setConfirmDeleteId(null);
                      } catch (err) {
                        alert("通天塔受阻（寫入失敗）。");
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className="bg-red-600 px-2 py-0.5 rounded text-white text-[9px] font-bold"
                  >
                    定
                  </button>
                  <button 
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-slate-500 px-1"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="pt-4 pb-12">
        <button 
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              // Perform atomic save using consolidated persistGlobal
              await persistGlobal({ 
                words: localWords, 
                batches: localBatches, 
                settings: localSettings 
              });
              
              if (curUser) {
                const updatedSelf = localUsers.find(u => u.id === curUser.id);
                if (updatedSelf) setCurUser(updatedSelf!);
              }
              alert("主宰法旨已封存！(仙冊經文已歸檔成功)");
              setView('lobby');
            } catch (err: any) {
              console.error(err);
              alert("封存失敗：權限不足。");
            } finally {
              setSaving(false);
            }
          }}
          className="w-full py-5 btn-gold text-2xl flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={24} />
          )}
          <span className="tracking-tighter">{saving ? '封存中...' : '封存法旨'}</span>
        </button>
      </div>
    </div>
  );
}
