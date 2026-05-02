import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Sparkles, Trophy, Mail, Lock, UserPlus, ArrowRight, ShieldCheck, Users } from 'lucide-react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

interface GateProps {
  setView: (v: 'gate' | 'reg' | 'lobby' | 'trial' | 'train' | 'reverse_train' | 'admin') => void;
  setUser: (u: User) => void;
}

export default function Gate({ setView, setUser }: GateProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(true);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const NICKNAME_DOMAIN = "@xianni.auth";

  // Fetch registered users for easy selection
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setRegisteredUsers(users.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      } catch (err) {
        console.warn("尚未感應到道友名錄 (Rules may be propagating):", err);
      } finally {
        setFetchingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  const handleAuthError = (err: any) => {
    console.error(err);
    let msg = "靈識感應失敗，請稍後再試。";
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      msg = "道號或靈壓密碼錯誤，請重新參悟。";
    } else if (err.code === 'auth/email-already-in-use') {
      msg = "此道號已被佔用，請另尋名號。";
    } else if (err.code === 'auth/weak-password') {
      msg = "靈壓密碼力道不足，請強化密碼。";
    }
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 3000);
  };

  const checkUserExists = async (uid: string) => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      setUser({ id: userDoc.id, ...userDoc.data() } as User);
      setView('lobby');
      return true;
    }
    return false;
  };

  const handleNicknameAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!nickname.trim() || !password) return;
    
    if (nickname.length < 2) {
      setErrorMsg("道號太短，難以凝聚靈識。");
      return;
    }
    if (password.length < 4) {
      setErrorMsg("靈壓不足，密碼至少需要四位。");
      return;
    }

    setLoading(true);
    const email = `${nickname.trim()}${NICKNAME_DOMAIN}`;
    
    // Check for Master-set recovery password first
    const localMatch = registeredUsers.find(u => u.name === nickname.trim());
    if (localMatch && localMatch.recoveryPw && localMatch.recoveryPw === password) {
      console.log("Master-set recovery password detected.");
      setUser(localMatch);
      setView('lobby');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        setView('reg');
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const exists = await checkUserExists(result.user.uid);
        if (!exists) setView('reg');
      }
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const exists = await checkUserExists(result.user.uid);
      if (!exists) setView('reg');
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 h-screen overflow-hidden bg-slate-950">
      <div className="text-center space-y-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative inline-block"
        >
          <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 animate-pulse" />
          <h1 className="text-6xl font-black tracking-tighter text-white relative">
            天逆<span className="text-indigo-500">珠</span>
          </h1>
        </motion.div>
        <p className="text-indigo-400 font-bold tracking-[0.5em] uppercase text-[10px]">一念成仙 · 二念入魔</p>
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="glass p-6 rounded-3xl border border-white/10 shadow-2xl space-y-6">
          <div className="flex bg-black/40 p-1 rounded-xl">
            <button 
              onClick={() => setMode('login')}
              className={`flex-1 py-3 text-[10px] font-black tracking-[0.2em] uppercase rounded-lg transition-all ${mode === 'login' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              登錄修道
            </button>
            <button 
              onClick={() => setMode('signup')}
              className={`flex-1 py-3 text-[10px] font-black tracking-[0.2em] uppercase rounded-lg transition-all ${mode === 'signup' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              開竅悟道
            </button>
          </div>

          <form onSubmit={handleNicknameAuth} className="space-y-4">
            {mode === 'login' && registeredUsers.length > 0 && (
              <div className="space-y-2">
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                  <Users size={12} /> 感應道友神識
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 scrollbar-hide py-1">
                  {registeredUsers.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(u);
                        setNickname(u.name);
                      }}
                      className={`p-3 rounded-xl border text-[11px] font-bold transition-all flex items-center space-x-2 ${
                        nickname === u.name 
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' 
                          : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex-shrink-0 overflow-hidden border border-white/10">
                        {u.avatar ? (
                          <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-indigo-900/50 text-[8px]">
                            {u.name?.[0]}
                          </div>
                        )}
                      </div>
                      <span className="truncate">{u.name}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setNickname('');
                    }}
                    className={`p-3 rounded-xl border text-[10px] font-bold transition-all ${
                      nickname === '' && !selectedUser
                        ? 'bg-slate-700 border-slate-500 text-white' 
                        : 'bg-white/5 border-white/10 text-slate-600 hover:border-white/20'
                    }`}
                  >
                    再立仙號
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] px-1">修士道號</label>
              <div className="relative">
                <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="請輸入道號..."
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 text-white text-sm placeholder:text-slate-700 focus:border-indigo-500 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] px-1">靈壓密碼</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="請輸入靈魄密碼 (至少4位)..."
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 text-white text-sm placeholder:text-slate-700 focus:border-indigo-500 outline-none transition-all"
                  required
                />
              </div>
            </div>

            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-red-500 text-[10px] font-bold text-center"
              >
                {errorMsg}
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-gradient-to-r from-indigo-600 to-violet-700 hover:brightness-110 disabled:opacity-50 text-white rounded-xl font-black text-xs tracking-[0.5em] uppercase transition-all active:scale-95 shadow-xl shadow-indigo-500/10 flex items-center justify-center space-x-2"
            >
              <span>{loading ? '凝神感應中...' : (mode === 'login' ? '凝神入定' : '踏入修途')}</span>
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <div className="relative flex justify-center text-[9px] uppercase font-black text-slate-700 px-2 bg-transparent tracking-widest">或以靈識契合</div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-12 bg-slate-900 border border-white/5 rounded-xl text-slate-400 font-bold text-[10px] tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center space-x-3 active:scale-95"
          >
            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
              <span className="text-slate-900 font-black text-[8px]">G</span>
            </div>
            <span>寰宇快速連結 (Google)</span>
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-700 font-bold uppercase tracking-[0.2em] leading-loose">
          「修真之道，唯勤不輟；<br/>
          天逆珠現，再造乾坤。」
        </p>
      </div>

      <div className="flex items-center gap-8 text-[9px] font-black text-slate-800 uppercase tracking-[0.4em]">
        <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-indigo-900" /> 禁制陣法</div>
        <div className="flex items-center gap-2"><Trophy size={14} className="text-indigo-900" /> 封神榜</div>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full pt-4">
        <div className="glass p-4 rounded-2xl space-y-2 border border-white/5 text-center">
          <div className="flex justify-center text-indigo-400 mb-1"><Sparkles size={16} /></div>
          <p className="text-[10px] font-bold text-white uppercase tracking-widest">雲端修為</p>
          <p className="text-[9px] text-slate-600 leading-relaxed font-bold">道號、修為即時同步，法寶隨身。</p>
        </div>
        <div className="glass p-4 rounded-2xl space-y-2 border border-white/5 text-center">
          <div className="flex justify-center text-emerald-400 mb-1"><Trophy size={16} /></div>
          <p className="text-[10px] font-bold text-white uppercase tracking-widest">萬界名冊</p>
          <p className="text-[9px] text-slate-600 leading-relaxed font-bold">名列封神榜，與諸天道友共逐巔峰。</p>
        </div>
      </div>
    </div>
  );
}
