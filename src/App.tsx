/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { collection, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from './lib/firebase';
import { User, Word, Batch, AppSettings } from './types';
import Gate from './components/Gate';
import Register from './components/Register';
import Lobby from './components/Lobby';
import HallOfFame from './components/HallOfFame';
import Treasury from './components/Treasury';
import Trial from './components/Trial';
import Training from './components/Training';
import ReverseTrain from './components/ReverseTrain';
import Admin from './components/Admin';
import { LayoutGroup, motion, AnimatePresence } from 'motion/react';
import { Home, Trophy, Swords } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'gate' | 'reg' | 'lobby' | 'trial' | 'train' | 'reverse_train' | 'admin'>('gate');
  const [tab, setTab] = useState<'home' | 'hall' | 'store'>('home');
  const [authReady, setAuthReady] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ rounds: 3, questions: 10, errors: 3, adminPw: "123456" });

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

  // Use a separate effect for data that requires authentication
  useEffect(() => {
    if (!user) {
      setUsers([]);
      return;
    }

    // Sync Users (for Hall of Fame and current user updates)
    const unsubUsers = onSnapshot(collection(db, 'users'), snapshot => {
      const cloudUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(cloudUsers);
      
      // Sync current user state if they are in the cloud list
      if (user) {
        const self = cloudUsers.find(u => u.id === user.id);
        if (self) setUser(self);
      }
    }, err => {
      import('./lib/firebase').then(({ handleFirestoreError, OperationType }) => {
        handleFirestoreError(err, OperationType.LIST, 'users');
      });
    });

    return () => unsubUsers();
  }, [user]);

  const persistGlobal = async (changes: { words?: Word[]; batches?: Batch[]; settings?: AppSettings }) => {
    try {
      const configRef = doc(db, 'global', 'config');
      // 確保使用最新的當前狀態，防止閉包陷阱
      const nextWords = changes.words !== undefined ? changes.words : words;
      const nextBatches = changes.batches !== undefined ? changes.batches : batches;
      const nextSettings = changes.settings !== undefined ? changes.settings : settings;
      
      await setDoc(configRef, {
        words: nextWords,
        batches: nextBatches,
        settings: nextSettings
      });
      
      // 雲端確認寫入成功後，才更新本地狀態
      if (changes.words) setWords([...changes.words]);
      if (changes.batches) setBatches([...changes.batches]);
      if (changes.settings) setSettings({...changes.settings});
      
    } catch (err: any) {
      console.error("無法封存全域數據:", err);
      // 增加更直觀的錯誤警報
      alert(`天道法則寫入失敗: ${err.message || '權限不足或網絡中斷'}`);
      throw err;
    }
  };

  const onUserUpdate = async (updated: User) => {
    const uid = auth.currentUser?.uid || user?.id;
    if (!uid) return;
    setUser(updated);
    try {
      await setDoc(doc(db, 'users', uid), updated, { merge: true });
    } catch (err) {
      const { handleFirestoreError, OperationType } = await import('./lib/firebase');
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  };

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

  return (
    <div className="relative min-h-screen flex flex-col items-center overflow-hidden bg-[#020617] text-slate-100">
      <div className="vortex" />
      <div className="relative z-10 w-full max-w-md min-h-screen flex flex-col">
        <LayoutGroup>
          <AnimatePresence mode="wait">
            {view === 'gate' && (
              <motion.div key="gate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
                <Gate setView={setView} setUser={setUser} />
              </motion.div>
            )}
            {view === 'reg' && (
              <motion.div key="reg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="flex-1 flex flex-col">
                <Register onBack={handleLogout} onDone={async (u) => { 
                  if (!auth.currentUser) return;
                  setUser(u);
                  try {
                    await setDoc(doc(db, 'users', auth.currentUser.uid), u);
                    setView('lobby');
                  } catch (err) {
                    const { handleFirestoreError, OperationType } = await import('./lib/firebase');
                    handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser.uid}`);
                  }
                }} />
              </motion.div>
            )}
            {view === 'lobby' && (
              <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col h-screen overflow-hidden">
                <div className="flex-1 overflow-hidden">
                  <AnimatePresence mode="wait">
                    {tab === 'home' && (
                      <motion.div key="home" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
                        <Lobby user={user!} settings={settings} words={words} setView={setView} onLogout={handleLogout} onUpdate={onUserUpdate} />
                      </motion.div>
                    )}
                    {tab === 'hall' && (
                      <motion.div key="hall" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="h-full">
                        <HallOfFame users={users} />
                      </motion.div>
                    )}
                    {tab === 'store' && (
                      <motion.div key="store" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full">
                        <Treasury words={words} user={user!} settings={settings} persistChanges={persistGlobal} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <nav className="fixed bottom-0 left-0 right-0 h-20 glass border-t border-white/5 flex justify-around items-center px-4 z-50 max-w-md mx-auto">
                  <button onClick={() => setTab('home')} className={`nav-item flex flex-col items-center space-y-1 ${tab === 'home' ? 'nav-active' : 'text-slate-500'}`}>
                    <Home className="w-5 h-5" />
                    <span className="text-[10px] font-bold">洞府</span>
                  </button>
                  <button onClick={() => setTab('hall')} className={`nav-item flex flex-col items-center space-y-1 ${tab === 'hall' ? 'nav-active' : 'text-slate-500'}`}>
                    <Trophy className="w-5 h-5" />
                    <span className="text-[10px] font-bold">封神榜</span>
                  </button>
                  <button onClick={() => setTab('store')} className={`nav-item flex flex-col items-center space-y-1 ${tab === 'store' ? 'nav-active' : 'text-slate-500'}`}>
                    <Swords className="w-5 h-5" />
                    <span className="text-[10px] font-bold">萬寶閣</span>
                  </button>
                </nav>
              </motion.div>
            )}
            {view === 'trial' && (
              <motion.div key="trial" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1 flex flex-col">
                <Trial user={user!} settings={settings} words={words} onUpdate={onUserUpdate} setView={setView} />
              </motion.div>
            )}
            {view === 'train' && (
              <motion.div key="train" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1 flex flex-col">
                <Training user={user!} words={words} onUpdate={onUserUpdate} setView={setView} />
              </motion.div>
            )}
            {view === 'reverse_train' && (
              <motion.div key="reverse" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1 flex flex-col">
                <ReverseTrain words={words} user={user!} onUpdate={onUserUpdate} setView={setView} />
              </motion.div>
            )}
            {view === 'admin' && (
              <motion.div key="admin" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="flex-1 flex flex-col">
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
      </div>
    </div>
  );
}
