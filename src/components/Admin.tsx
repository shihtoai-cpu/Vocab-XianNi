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

  // Sync with props when background updates happen (from Cloud sync)
  useEffect(() => {
    setLocalWords(initialWords);
  }, [initialWords]);

  useEffect(() => {
    setLocalBatches(initialBatches);
  }, [initialBatches]);

  useEffect(() => {
    setLocalSettings(initialSettings);
  }, [initialSettings]);

  useEffect(() => {
    setLocalUsers(initialUsers);
  }, [initialUsers]);

  // Custom Modal State
  const [modal, setModal] = useState<{
    show: boolean;
    title: string;
    msg: string;
    value?: string;
    type: 'prompt' | 'confirm' | 'alert';
    onConfirm: (val?: string) => void;
  }>({
    show: false,
    title: "",
    msg: "",
    type: 'alert',
    onConfirm: () => {}
  });

  const showPrompt = (title: string, msg: string, initial: string, onConfirm: (v: string) => void) => {
    setModal({ show: true, title, msg, value: initial, type: 'prompt', onConfirm: (v) => onConfirm(v || "") });
  };

  const showConfirm = (title: string, msg: string, onConfirm: () => void) => {
    setModal({ show: true, title, msg, type: 'confirm', onConfirm: () => onConfirm() });
  };

  const showAlert = (title: string, msg: string) => {
    setModal({ show: true, title, msg, type: 'alert', onConfirm: () => {} });
  };

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

      setLocalWords([...localWords, ...news]);
      const newBatches = [...localBatches, { id: bid, d: new Date().toLocaleString(), c: news.length }];
      setLocalBatches(newBatches);
      showAlert("系統提示", "仙冊經文匯入成功！記得後續點擊『封存法旨』以確保存檔。");
    };
    r.readAsText(f);
  };

  const handleAuth = async () => {
    if (pw === localSettings.adminPw) {
      // 1. 先開啟本地主宰權限
      setAuth(true);
      
      // 2. 強制在雲端修士存檔中刻印主宰標記
      if (curUser && curUser.id) {
        try {
          const { updateDoc, doc, getDoc } = await import('firebase/firestore');
          const userRef = doc(db, 'users', curUser.id);
          
          console.log("正在刻印主宰印記，目標 UID:", curUser.id);
          await updateDoc(userRef, { isMaster: true });
          
          // 重新抓取一次確認
          const snap = await getDoc(userRef);
          if (snap.exists() && snap.data().isMaster === true) {
            console.log("主宰印記刻印成功！天道已認證您的權限。");
            setCurUser({ ...curUser, isMaster: true });
            showAlert("權限解開", "主宰印記已成功刻印，您現在具備全域修改權限。");
          }
        } catch (err) {
          console.error("主宰印記刻印失敗 (可能是權限不足):", err);
          showAlert("權限受阻", "無法在大道中留下主宰印記。請確認您的網路連線，或嘗試重新整理頁面再試。");
        }
      }
    } else {
      showAlert("禁制回饋", "密碼錯誤");
    }
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
        onKeyUp={e => e.key === 'Enter' && handleAuth()} 
      />
      <button onClick={handleAuth} className="w-full py-4 btn-gold text-lg tracking-widest">解開禁制</button>
      <button onClick={() => setView('lobby')} className="text-slate-600 font-bold text-[10px] uppercase tracking-[0.5em]">返回洞府</button>
    </div>
  );

  return (
    <div className="p-6 flex flex-col space-y-8 overflow-y-auto h-screen pb-24 scrollbar-hide">
      {/* Custom Modal Rendering */}
      {modal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-sm bg-black/60 animate-in fade-in duration-200">
          <div className="w-full max-w-xs glass border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl scale-in-center">
            <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-widest border-b border-white/5 pb-2">{modal.title}</h4>
            <p className="text-slate-300 text-xs leading-relaxed">{modal.msg}</p>
            
            {modal.type === 'prompt' && (
              <input 
                type="text" 
                autoFocus
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm outline-none focus:border-indigo-500"
                value={modal.value}
                onChange={e => setModal({...modal, value: e.target.value})}
              />
            )}

            <div className="flex space-x-2 pt-2">
              <button 
                onClick={() => {
                  modal.onConfirm(modal.value);
                  setModal({...modal, show: false});
                }}
                className="flex-1 bg-indigo-600 py-2 rounded-lg text-white text-xs font-bold hover:bg-indigo-500 transition-all"
              >
                {modal.type === 'alert' ? '知曉了' : '確認'}
              </button>
              {modal.type !== 'alert' && (
                <button 
                  onClick={() => setModal({...modal, show: false})}
                  className="flex-1 bg-white/5 py-2 rounded-lg text-slate-400 text-xs font-bold hover:bg-white/10 transition-all"
                >
                  取消
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mt-4">
        <h2 className="text-xl font-bold text-white tracking-tight uppercase">主宰殿</h2>
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
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-bold text-white uppercase tracking-tight">{u.name}</p>
                    <button 
                      onClick={() => {
                        showPrompt("更名法旨", "請輸入新修士道號：", u.name, async (newName) => {
                          if (newName && newName !== u.name) {
                            const trimmed = newName.trim();
                            const isDuplicate = localUsers.some((x, idx) => idx !== i && x.name.toLowerCase() === trimmed.toLowerCase());
                            if (isDuplicate) return showAlert("天道排斥", "此道號已有修士佔用，請另尋名號。");
                            
                            if (u.id) {
                              await updateDoc(doc(db, 'users', u.id), { name: trimmed });
                            }
                            const newList = [...localUsers];
                            newList[i].name = trimmed;
                            setLocalUsers(newList);
                            persistUsers(newList);
                          }
                        });
                      }}
                      className="text-[8px] text-indigo-400 border border-indigo-400/30 px-1 rounded hover:bg-indigo-400 hover:text-white transition-all uppercase"
                    >
                      更名
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-500 font-mono">修為: {u.exp}</p>
                  {u.recoveryPw && <p className="text-[9px] text-emerald-500 font-bold">主宰重設密碼: {u.recoveryPw}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-4">
                <button onClick={() => {
                  showPrompt("修為調整", `請輸入修士 ${u.name} 的新修為點數：`, u.exp.toString(), async (e) => {
                    if (e !== "" && u.id) {
                      const newExp = parseInt(e);
                      if (isNaN(newExp)) return showAlert("法力偏差", "輸入之數非靈氣之量（請輸入數字）");
                      await updateDoc(doc(db, 'users', u.id), { exp: newExp });
                      const newList = localUsers.map(x => x.id === u.id ? {...x, exp: newExp} : x);
                      setLocalUsers(newList);
                      persistUsers(newList);
                      // Snappy update if editing self
                      if (curUser && curUser.id === u.id) {
                        setCurUser({...curUser, exp: newExp});
                      }
                    }
                  });
                }} className="text-[9px] bg-slate-950 p-2 rounded border border-slate-800 text-slate-400 font-bold uppercase hover:text-white">調整修為</button>

                <button onClick={() => {
                  showPrompt("密碼重設", "為主宰設置此修士的臨時登入密碼 (留空則取消，至少4位元)：", u.recoveryPw || "", async (newPw) => {
                    const pwVal = newPw.trim();
                    if (pwVal && pwVal.length < 4) return showAlert("靈壓不足", "天道法則規定，靈壓密碼至少需 4 位以上。");
                    
                    if (u.id) {
                      await updateDoc(doc(db, 'users', u.id), { recoveryPw: pwVal || null });
                      const newList = [...localUsers];
                      newList[i].recoveryPw = pwVal || undefined;
                      setLocalUsers(newList);
                      persistUsers(newList);
                    }
                  });
                }} className="text-[9px] bg-slate-950 p-2 rounded border border-slate-800 text-emerald-500 font-bold uppercase hover:bg-emerald-950/20">設置密碼</button>

                <button onClick={() => {
                  if (u.id) {
                    showConfirm("逐出仙門", `確定要將修士 ${u.name} 逐出仙門？此舉將抹除其所有修行痕跡。`, async () => {
                      await deleteDoc(doc(db, 'users', u.id!));
                      const newList = localUsers.filter(x => x.id !== u.id);
                      setLocalUsers(newList);
                      persistUsers(newList);
                    });
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
                onClick={() => {
                  showConfirm("焚毀全卷", "確定要將所有經文焚毀？此舉將令萬寶閣徹底清空，所有修行資糧將灰飛煙滅。", async () => {
                    setSaving(true);
                    try {
                      await persistGlobal({ words: [], batches: [] });
                      setLocalWords([]);
                      setLocalBatches([]);
                      setConfirmDeleteAll(false);
                      showAlert("法旨達成", "萬物皆空，仙冊已焚。");
                    } catch (err) {
                      showAlert("天道崩塌", "同步失敗，請稍後再試。");
                    } finally {
                      setSaving(false);
                    }
                  });
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
                    onClick={() => {
                      showConfirm("焚毀仙卷", `確定要將此卷「${b.d}」永久焚毀？`, async () => {
                        const newWords = localWords.filter(w => w.bid !== b.id);
                        const newBatches = localBatches.filter(x => x.id !== b.id);
                        
                        setSaving(true);
                        try {
                          await persistGlobal({ words: newWords, batches: newBatches });
                          setLocalWords(newWords);
                          setLocalBatches(newBatches);
                          setConfirmDeleteId(null);
                        } catch (err) {
                          showAlert("封存失敗", "通天塔受阻（雲端同步失敗）。");
                        } finally {
                          setSaving(false);
                        }
                      });
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
              showAlert("法旨封存", "主宰法旨已封存！(仙冊經文已歸檔成功)");
              setView('lobby');
            } catch (err: any) {
              console.error(err);
              showAlert("封存失敗", "天道法則拒絕了您的變更，請核對權限或連線。");
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
