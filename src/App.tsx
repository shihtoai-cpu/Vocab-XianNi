/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { collection, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from './lib/firebase';
import { User, Word, Batch, AppSettings } from './types';
import { mergeWords } from './lib/wordUtils';
import Gate from './components/Gate';
import Register from './components/Register';
import Lobby from './components/Lobby';
import HallOfFame from './components/HallOfFame';
import Treasury from './components/Treasury';
import Trial from './components/Trial';
import ClozeTrial from './components/ClozeTrial';
import Training from './components/Training';
import ReverseTrain from './components/ReverseTrain';
import Admin from './components/Admin';
import { LayoutGroup, motion, AnimatePresence } from 'motion/react';
import { Home, Trophy, Swords, Zap, Wind, Brain, Settings, ChevronRight, Moon, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { calculateRecovery } from './lib/stamina';

export default function App() {
  const [view, setView] = useState<'gate' | 'reg' | 'lobby' | 'trial' | 'cloze_trial' | 'train' | 'reverse_train' | 'admin'>('gate');
  const [tab, setTab] = useState<'home' | 'hall' | 'store' | 'practice'>('home');
  const [authReady, setAuthReady] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ rounds: 3, questions: 10, errors: 3, adminPw: "123456" });

  const mergedWords = useMemo(() => mergeWords(words), [words]);

  useEffect(() => {
    // Auth Listener
    const unsubAuth = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // Logged in
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() } as User);
          setView('lobby');
        } else {
          // New Google User
          setView('reg');
        }
      } else {
        // Logged out
        setUser(null);
        setView('gate');
      }
      setAuthReady(true);
    });

    // Sync Global Config
    const configDoc = doc(db, 'global', 'config');
    const unsubConfig = onSnapshot(configDoc, snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.words) setWords(data.words);
        if (data.batches) setBatches(data.batches);
        if (data.settings) setSettings(data.settings as AppSettings);
      }
    }, err => {
      import('./lib/firebase').then(({ handleFirestoreError, OperationType }) => {
        handleFirestoreError(err, OperationType.GET, 'global/config');
      });
    });

    return () => {
      unsubAuth();
      unsubConfig();
    };
  }, []);

  // Use a separate effect for data that can be public or shared
  useEffect(() => {
    // Sync Users (for Hall of Fame, unique name check, and login selection)
    const unsubUsers = onSnapshot(collection(db, 'users'), snapshot => {
      const cloudUsers = snapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() } as User;
        // 在數據進入系統時立即進行修正計算
        return calculateRecovery(data);
      });
      setUsers(cloudUsers);
      
      // Sync current user state if they are logged in and in the cloud list
      const authUser = auth.currentUser;
      if (authUser?.uid) {
        const self = cloudUsers.find(u => u.id === authUser.uid);
        if (self) {
          // 如果計算後的數據與原始數據不同（需要遷移或恢復），則觸發後台保存
          setUser(self);
        }
      }
    }, err => {
      console.warn("山門感應受阻 (Users fetch error):", err);
    });

    return () => unsubUsers();
  }, []);

  const persistGlobal = async (changes: { words?: Word[]; batches?: Batch[]; settings?: AppSettings }) => {
    // 身份校驗：僅限主宰或正式管理員寫入
    const authEmail = auth.currentUser?.email;
    const isMasterEmail = authEmail === "shihto.ai@gmail.com";
    const isMasterFlag = user?.isMaster === true;

    if (!auth.currentUser || (!isMasterEmail && !isMasterFlag)) {
      const msg = !auth.currentUser 
        ? "尚未登錄身份（如使用 Google 登入），無法動用法則。" 
        : `您的身份（${authEmail}）非主宰，且修士記錄無主宰印記，無權刻印全域配置。`;
      alert(msg);
      throw new Error("PERMISSION_DENIED");
    }

    try {
      const configRef = doc(db, 'global', 'config');
      const nextWords = changes.words !== undefined ? changes.words : words;
      const nextBatches = changes.batches !== undefined ? changes.batches : batches;
      const nextSettings = changes.settings !== undefined ? changes.settings : settings;
      
      await setDoc(configRef, {
        words: nextWords,
        batches: nextBatches,
        settings: nextSettings
      }, { merge: true });
      
      if (changes.words) setWords([...changes.words]);
      if (changes.batches) setBatches([...changes.batches]);
      if (changes.settings) setSettings({...changes.settings});
      
    } catch (err: any) {
      console.error("無法封存全域數據:", err);
      const errMsg = err.message || "";
      if (errMsg.includes("permission")) {
        alert("天道（雲端規則）拒絕了主宰的刻印請求。這通常是因為雲端 Security Rules 尚未更新。請檢查主宰身份與 Rules 配置。");
      } else {
        alert(`天道法則寫入失敗: ${errMsg}`);
      }
      throw err;
    }
  };

  const onUserUpdate = async (updated: User) => {
    const authUid = auth.currentUser?.uid;
    const targetUid = updated.id || user?.id;
    
    if (!targetUid) return;
    
    // Ensure lastRefresh is always there when we update
    const finalUpdate = {
      ...updated,
      lastRefresh: updated.lastRefresh || Date.now()
    };

    // 1. Always update local state for snappy UI
    setUser(finalUpdate);
    
    // 2. Only persist to Firestore if we have a valid Auth session
    // AND permissions (Self or Admin)
    const isAdmin = auth.currentUser?.email === "shihto.ai@gmail.com";
    const isSelf = authUid === targetUid;

    if (authUid && (isSelf || isAdmin)) {
      try {
        // Use a clean version of the object for Firestore (optional: omit large fields if not needed)
        await setDoc(doc(db, 'users', targetUid), finalUpdate, { merge: true });
      } catch (err) {
        console.error("Cloud Sync Failed:", err);
        // We don't alert here anymore to avoid annoying the user if they're playing
      }
    } else {
      // Log local update only
      if (!auth.currentUser) {
        console.log("Local-only update: User is logged in via recovery password or not authenticated.");
      }
    }
  };

  const userRef = useMemo(() => ({ current: user }), [user]);

  useEffect(() => {
    if (!user) return;

    // Run recovery immediately on load to sanitize legacy data (like 1395 Qi)
    const initialRecovered = calculateRecovery(user);
    const hasInitChanged = 
      initialRecovered.jing !== user.jing || 
      initialRecovered.qi !== user.qi || 
      initialRecovered.shen !== user.shen ||
      initialRecovered.totalExp !== user.totalExp;

    if (hasInitChanged) {
      onUserUpdate(initialRecovered);
    }

    const interval = setInterval(() => {
      // Use the latest user data from the ref
      const currentUser = userRef.current;
      if (!currentUser) return;
      
      const recovered = calculateRecovery(currentUser);
      if (recovered.jing !== currentUser.jing || recovered.qi !== currentUser.qi || recovered.shen !== currentUser.shen) {
        onUserUpdate(recovered);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user?.id]); // Only re-run the setup if the user ID changes

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setView('gate');
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const showHud = user && view !== 'gate' && view !== 'reg' && view !== 'admin';
  const showNav = user && view !== 'gate' && view !== 'reg' && view !== 'admin';

  // HUD stats sync
  const jing = user?.jing || 0;
  const qi = user?.qi || 0;
  const shen = user?.shen || 0;
  const maxJing = user?.maxJing || 20;
  const maxQi = user?.maxQi || 20;
  const maxShen = user?.maxShen || 20;

  return (
    <div className="relative h-screen w-full flex flex-col items-center overflow-hidden bg-[#020617] text-slate-100 font-sans select-none">
      <div className="vortex pointer-events-none opacity-50" />
      
      <div className="relative z-10 w-full max-w-md h-full flex flex-col shadow-2xl bg-[#020617]/90 backdrop-blur-md">
        
        {/* Persistent Cultivator HUD */}
        <AnimatePresence>
          {showHud && (
            <motion.header 
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              className="h-16 shrink-0 border-b border-white/5 flex items-center px-4 justify-between bg-slate-950/40 relative z-50"
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1">
                    <Zap size={10} className="text-amber-400" />
                    <span className="text-[9px] font-black text-amber-500/80 uppercase tracking-widest">精</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-amber-200 leading-none">{jing}/{maxJing}</span>
                </div>
                <div className="w-[1px] h-6 bg-white/5" />
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1">
                    <Wind size={10} className="text-cyan-400" />
                    <span className="text-[9px] font-black text-cyan-500/80 uppercase tracking-widest">氣</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-cyan-200 leading-none">{qi}/{maxQi}</span>
                </div>
                <div className="w-[1px] h-6 bg-white/5" />
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1">
                    <Brain size={10} className="text-purple-400" />
                    <span className="text-[9px] font-black text-purple-500/80 uppercase tracking-widest">神</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-purple-200 leading-none">{shen}/{maxShen}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden xs:block">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{user?.isMaster ? '主宰者' : '初探修士'}</div>
                  <div className="text-xs font-bold text-slate-300 truncate max-w-[80px]">{user?.name}</div>
                </div>
                <div className="w-9 h-9 rounded-full border-2 border-indigo-500/30 overflow-hidden bg-slate-800 shadow-lg shadow-indigo-500/10">
                  <img src={user?.avatar} alt="avatar" className="w-full h-full object-cover" />
                </div>
              </div>
            </motion.header>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 relative overflow-hidden flex flex-col">
          <LayoutGroup>
            <AnimatePresence mode="wait">
              {view === 'gate' && (
                <motion.div key="gate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col">
                  <Gate setView={setView} setUser={setUser} users={users} />
                </motion.div>
              )}
              {view === 'reg' && (
                <motion.div key="reg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute inset-0 flex flex-col p-4 bg-[#020617] z-[100]">
                  <Register 
                    users={users}
                    onBack={handleLogout} 
                    onDone={async (u) => { 
                      if (!auth.currentUser) return;
                      setUser(u);
                      try {
                        await setDoc(doc(db, 'users', auth.currentUser.uid), u);
                        setView('lobby');
                      } catch (err) {
                        const { handleFirestoreError, OperationType } = await import('./lib/firebase');
                        handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser.uid}`);
                      }
                    }} 
                  />
                </motion.div>
              )}
              
              {user && view !== 'gate' && view !== 'reg' && view !== 'admin' && (
                <motion.div key="main-app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col overflow-hidden">
                  <AnimatePresence mode="wait">
                    {tab === 'home' && (
                      <motion.div key="tab-home" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
                        <Lobby user={user!} settings={settings} words={mergedWords} setView={(v) => { setView(v); setTab('practice'); }} onLogout={handleLogout} onUpdate={onUserUpdate} />
                      </motion.div>
                    )}
                    {tab === 'hall' && (
                      <motion.div key="tab-hall" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-full">
                        <HallOfFame users={users} />
                      </motion.div>
                    )}
                    {tab === 'store' && (
                      <motion.div key="tab-store" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full">
                        <Treasury words={mergedWords} user={user!} settings={settings} persistChanges={persistGlobal} />
                      </motion.div>
                    )}
                    {tab === 'practice' && (
                      <motion.div key="tab-practice" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="h-full flex flex-col">
                        <AnimatePresence mode="wait">
                          {view === 'lobby' ? (
                            <motion.div key="practice-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col p-6 space-y-6">
                              <div className="text-center space-y-2 py-4">
                                <h3 className="text-2xl font-black text-indigo-400 uppercase tracking-widest">功法參悟</h3>
                                <p className="text-xs text-slate-500 font-bold">選擇適合當前修為的試煉法門</p>
                              </div>
                              <div className="grid grid-cols-1 gap-4">
                                <button onClick={() => setView('trial')} className="p-6 rounded-3xl glass border-indigo-500/20 flex items-center justify-between group active:scale-95 transition-all">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30 group-hover:bg-indigo-500/40 transition-colors">
                                      <Zap size={24} />
                                    </div>
                                    <div className="text-left">
                                      <div className="text-sm font-black text-white">玄黃試煉</div>
                                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">常規修煉 · 精氣增益</div>
                                    </div>
                                  </div>
                                  <ChevronRight size={16} className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </button>
                                
                                <button onClick={() => setView('cloze_trial')} className="p-6 rounded-3xl glass border-purple-500/20 flex items-center justify-between group active:scale-95 transition-all">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30 group-hover:bg-purple-500/40 transition-colors">
                                      <Brain size={24} />
                                    </div>
                                    <div className="text-left">
                                      <div className="text-sm font-black text-white">神卷試煉</div>
                                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">道法意境 · 精神錘煉</div>
                                    </div>
                                  </div>
                                  <ChevronRight size={16} className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </button>
                                
                                <button onClick={() => setView('train')} className="p-6 rounded-3xl glass border-amber-500/20 flex items-center justify-between group active:scale-95 transition-all">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/30 group-hover:bg-amber-500/40 transition-colors">
                                      <Wind size={24} />
                                    </div>
                                    <div className="text-left">
                                      <div className="text-sm font-black text-white">天逆空間</div>
                                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">極速參悟 · 靈氣彙聚</div>
                                    </div>
                                  </div>
                                  <ChevronRight size={16} className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </button>

                                <button onClick={() => setView('reverse_train')} className="p-6 rounded-3xl glass border-red-500/20 flex items-center justify-between group active:scale-95 transition-all">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-400 border border-red-500/30 group-hover:bg-red-500/40 transition-colors">
                                      <RotateCcw size={24} />
                                    </div>
                                    <div className="text-left">
                                      <div className="text-sm font-black text-white">逆練魂珠</div>
                                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">禁忌逆練 · 古神傳承</div>
                                    </div>
                                  </div>
                                  <ChevronRight size={16} className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </button>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div key="practice-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
                              {view === 'trial' && <Trial user={user!} settings={settings} words={mergedWords} onUpdate={onUserUpdate} setView={setView} />}
                              {view === 'cloze_trial' && <ClozeTrial user={user!} words={mergedWords} settings={settings} onUpdate={onUserUpdate} setView={setView} />}
                              {view === 'train' && <Training user={user!} words={mergedWords} onUpdate={onUserUpdate} setView={setView} />}
                              {view === 'reverse_train' && <ReverseTrain words={mergedWords} user={user!} onUpdate={onUserUpdate} setView={setView} />}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {view === 'admin' && (
                <motion.div key="admin" initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="absolute inset-0 z-50 bg-[#020617] flex flex-col overflow-y-auto pt-safe">
                  <Admin 
                    settings={settings} 
                    words={words} 
                    batches={batches} 
                    users={users} 
                    persistGlobal={persistGlobal}
                    setUsers={setUsers} 
                    setView={setView} 
                    curUser={user} 
                    setCurUser={setUser} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </LayoutGroup>
        </main>

        {/* Persistent Bottom Navigation */}
        <AnimatePresence>
          {showNav && (
            <motion.nav 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="h-20 shrink-0 glass border-t border-white/5 flex justify-around items-center px-2 safe-bottom z-50"
            >
              <button 
                onClick={() => { setTab('home'); setView('lobby'); }} 
                className={`flex-1 flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${tab === 'home' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <div className={`p-2 rounded-2xl transition-all duration-300 ${tab === 'home' ? 'bg-indigo-500/20 scale-110 shadow-lg shadow-indigo-500/20' : ''}`}>
                  <Home size={22} className={tab === 'home' ? 'fill-indigo-500/20' : ''} />
                </div>
                <span className={`text-[10px] font-black tracking-widest uppercase transition-all ${tab === 'home' ? 'opacity-100' : 'opacity-60'}`}>洞府</span>
              </button>
              
              <button 
                onClick={() => { setView('lobby'); setTab('practice'); }} 
                className={`flex-1 flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${tab === 'practice' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <div className={`p-2 rounded-2xl transition-all duration-300 ${tab === 'practice' ? 'bg-indigo-500/20 scale-110 shadow-lg shadow-indigo-500/20' : ''}`}>
                  <Zap size={22} className={tab === 'practice' ? 'fill-indigo-500/20' : ''} />
                </div>
                <span className={`text-[10px] font-black tracking-widest uppercase transition-all ${tab === 'practice' ? 'opacity-100' : 'opacity-60'}`}>修煉</span>
              </button>

              <button 
                onClick={() => { setTab('hall'); setView('lobby'); }} 
                className={`flex-1 flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${tab === 'hall' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <div className={`p-2 rounded-2xl transition-all duration-300 ${tab === 'hall' ? 'bg-indigo-500/20 scale-110 shadow-lg shadow-indigo-500/20' : ''}`}>
                  <Trophy size={22} className={tab === 'hall' ? 'fill-indigo-500/20' : ''} />
                </div>
                <span className={`text-[10px] font-black tracking-widest uppercase transition-all ${tab === 'hall' ? 'opacity-100' : 'opacity-60'}`}>封神</span>
              </button>

              <button 
                onClick={() => { setTab('store'); setView('lobby'); }} 
                className={`flex-1 flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${tab === 'store' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <div className={`p-2 rounded-2xl transition-all duration-300 ${tab === 'store' ? 'bg-indigo-500/20 scale-110 shadow-lg shadow-indigo-500/20' : ''}`}>
                  <Swords size={22} className={tab === 'store' ? 'fill-indigo-500/20' : ''} />
                </div>
                <span className={`text-[10px] font-black tracking-widest uppercase transition-all ${tab === 'store' ? 'opacity-100' : 'opacity-60'}`}>萬寶</span>
              </button>
            </motion.nav>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
