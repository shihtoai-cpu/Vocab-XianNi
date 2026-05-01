import { useState, useEffect } from 'react';
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

  const NICKNAME_DOMAIN = "@xianni.auth";

  // Fetch registered users for easy selection
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setRegisteredUsers(users.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error("Failed to fetch Daoists:", err);
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
    alert(msg);
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
    if (!nickname.trim() || !password) return;
    
    if (nickname.length < 2) return alert("道號太短，難以凝聚靈識。");
    if (password.length < 6) return alert("靈壓不足，密碼至少需要六位。");

    setLoading(true);
    const email = `${nickname.trim()}${NICKNAME_DOMAIN}`;
    
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
        <p className="text-slate-400 font-medium tracking-[0.3em] uppercase text-[10px]">修仙單字試煉場</p>
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="glass p-6 rounded-3xl border border-white/10 shadow-2xl space-y-6">
          <div className="flex bg-black/40 p-1 rounded-xl">
            <button 
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              進入試煉
            </button>
            <button 
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'signup' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              開竅註冊
            </button>
          </div>

          <form onSubmit={handleNicknameAuth} className="space-y-4">
            {mode === 'login' && registeredUsers.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">選擇修士</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 scrollbar-hide">
                  {registeredUsers.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(u);
                        setNickname(u.name);
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center space-x-2 ${
                        nickname === u.name 
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' 
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <img src={u.avatar} alt="" className="w-6 h-6 rounded-full bg-slate-800 object-cover" />
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
                        : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                    }`}
                  >
                    自填道號
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">修士道號</label>
              <div className="relative">
                <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="輸入你的道號..."
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">靈壓密碼</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="輸入你的靈壓密碼..."
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 text-white rounded-xl font-black tracking-widest transition-all active:scale-95 shadow-xl flex items-center justify-center space-x-2"
            >
              <span>{loading ? '感應靈氣中...' : (mode === 'login' ? '開始修煉' : '正式入道')}</span>
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-600 px-2 bg-transparent">或以靈識感應</div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-12 glass border border-white/10 rounded-xl text-white font-bold text-xs hover:bg-white/5 transition-all flex items-center justify-center space-x-2 active:scale-95"
          >
            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
              <span className="text-slate-900 font-black text-[10px]">G</span>
            </div>
            <span>Google 快速進入</span>
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-600 italic">
          「修真之道，唯勤不輟；天逆珠現，再造乾坤。」
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full pt-4">
        <div className="glass p-4 rounded-2xl space-y-2 border border-white/5">
          <div className="text-indigo-400"><Sparkles size={16} /></div>
          <p className="text-[10px] font-bold text-white uppercase tracking-tight">雲端修為</p>
          <p className="text-[10px] text-slate-500 leading-relaxed">道號、進度即時同步，縱使更換法寶亦能續練。</p>
        </div>
        <div className="glass p-4 rounded-2xl space-y-2 border border-white/5">
          <div className="text-emerald-400"><Trophy size={16} /></div>
          <p className="text-[10px] font-bold text-white uppercase tracking-tight">萬界排名</p>
          <p className="text-[10px] text-slate-500 leading-relaxed">位列封神碑，與諸天萬界之修士共逐巔峰。</p>
        </div>
      </div>
    </div>
  );
}
