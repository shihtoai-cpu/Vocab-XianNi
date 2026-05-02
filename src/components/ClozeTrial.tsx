/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Word, User, AppSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Scroll, Sparkles, AlertCircle, CheckCircle2, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { generateClozeQuestion, ClozeQuestion } from '../services/aiService';
import confetti from 'canvas-confetti';

interface ClozeTrialProps {
  user: User;
  words: Word[];
  settings: AppSettings;
  onUpdate: (u: User) => Promise<void>;
  setView: (v: any) => void;
}

export default function ClozeTrial({ user, words, settings, onUpdate, setView }: ClozeTrialProps) {
  const [qIdx, setQIdx] = useState(0);
  const [currentQ, setCurrentQ] = useState<ClozeQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [totalQuestions] = useState(5); 
  const [gameOver, setGameOver] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    if (difficulty && !gameOver) fetchNextQuestion();
    setShowAnalysis(false);
  }, [qIdx, difficulty]);

  const fetchNextQuestion = async () => {
    if (words.length < 5 || !difficulty) return;
    setLoading(true);
    setSelected(null);
    setIsCorrect(null);

    const target = words[Math.floor(Math.random() * words.length)];
    let samePos = words.filter(w => w.pos === target.pos && w.en !== target.en);
    if (samePos.length < 3) samePos = words.filter(w => w.en !== target.en);
    
    const distractors = samePos
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map(w => w.en);

    try {
      const q = await generateClozeQuestion(target.en, target.zh, distractors, difficulty);
      setCurrentQ(q);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (word: string) => {
    if (selected || loading || !currentQ) return;
    setSelected(word);
    const correct = word === currentQ.answer;
    setIsCorrect(correct);

    if (correct) {
      setScore(s => s + 1);
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
    }
  };

  const nextAction = () => {
    if (qIdx + 1 >= totalQuestions) {
      finishTrial();
    } else {
      setQIdx(qIdx + 1);
    }
  };

  const finishTrial = async () => {
    setGameOver(true);
    const expGain = score * 50;
    const newUser = { ...user, exp: (user.exp || 0) + expGain };
    await onUpdate(newUser);
  };

  if (words.length < 5) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-4 bg-[#020617]">
        <AlertCircle className="w-12 h-12 text-amber-500 opacity-50" />
        <h3 className="text-xl font-bold text-white">經文不足</h3>
        <p className="text-slate-500 text-sm">神卷試煉至少需要 5 卷經文方可開啟。</p>
        <button onClick={() => setView('lobby')} className="px-6 py-2 bg-indigo-600 rounded-full text-xs font-bold">返回洞府</button>
      </div>
    );
  }

  if (!difficulty) {
    return (
      <div className="flex-1 flex flex-col bg-[#020617] p-8 justify-center space-y-12 animate-in fade-in h-screen overflow-y-auto">
        <div className="text-center space-y-4 pt-10">
          <Scroll className="w-16 h-16 text-indigo-500 mx-auto opacity-50" />
          <h2 className="text-3xl font-black text-white tracking-widest">神卷試煉 · 參悟境</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">請選擇試煉難度 (將影響靈句深淺)</p>
        </div>

        <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto w-full">
          {[
            { id: 'easy', name: '啟蒙玄卷 (基礎)', desc: '適合初學者，描述生活與紮根', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' },
            { id: 'medium', name: '凌雲神章 (貫通)', desc: '融合時事、科普與歷屆考題風格', color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5' },
            { id: 'hard', name: '混沌天書 (巔峰)', desc: '天道之謎，內容涵蓋國際與專業深度', color: 'border-rose-500/30 text-rose-400 bg-rose-500/5' }
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id as any)}
              className={`p-6 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-95 ${d.color}`}
            >
              <h3 className="font-black text-lg uppercase tracking-tight">{d.name}</h3>
              <p className="opacity-60 text-xs font-bold uppercase tracking-wider mt-1">{d.desc}</p>
            </button>
          ))}
        </div>

        <button onClick={() => setView('lobby')} className="text-slate-600 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors pb-10">暫緩參悟</button>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-8 animate-in fade-in zoom-in bg-[#020617]">
        <div className="relative">
          <Scroll className="w-24 h-24 text-indigo-500 opacity-20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-indigo-400 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-white tracking-widest">神卷試煉圓滿</h2>
          <p className="text-slate-500 font-bold uppercase tracking-tighter">此番渡劫 獲得修為: +{score * 50}</p>
        </div>
        <div className="text-6xl font-black text-indigo-400">{score}/{totalQuestions}</div>
        <button onClick={() => setView('lobby')} className="w-full max-w-xs py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg transition-all active:scale-95">收功回府</button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#020617] relative overflow-hidden">
      <div className="sticky top-0 left-0 right-0 h-1 bg-white/5 z-[60]">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(qIdx / totalQuestions) * 100}%` }}
          className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1]"
        />
      </div>

      <div className="flex-none p-6 flex justify-between items-center z-50 bg-[#020617]/95 backdrop-blur-md border-b border-white/5">
        <button onClick={() => setView('lobby')} className="p-2 text-slate-500 hover:text-white transition-colors">
          <XCircle className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-2">
            <Scroll className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">神卷試煉 {qIdx + 1}/{totalQuestions}</span>
          </div>
          <span className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em]">
            {difficulty === 'easy' ? '啟蒙玄卷' : difficulty === 'medium' ? '凌雲神章' : '混沌天書'}
          </span>
        </div>
        <div className="text-xs font-black text-indigo-400">得分: {score}</div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        <div className="max-w-2xl mx-auto px-6 py-10 space-y-10 pb-60"> 
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center min-h-[300px] space-y-4"
              >
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-slate-500 text-sm font-bold">天道衍化神卷中...</p>
              </motion.div>
            ) : currentQ ? (
              <motion.div 
                key={qIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="space-y-6">
                  <div className="relative p-8 rounded-3xl bg-indigo-950/20 border border-indigo-500/20 shadow-2xl">
                    <p className="text-xl md:text-2xl font-medium leading-relaxed text-slate-100">
                      {currentQ.sentence}
                    </p>
                    {(selected || isCorrect !== null) && (
                      <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 text-sm text-indigo-300 font-bold leading-relaxed border-t border-indigo-500/20 pt-4"
                      >
                        {currentQ.translation}
                      </motion.p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {currentQ.options.map((opt, i) => {
                    const isAnswer = opt.word === currentQ.answer;
                    const isSelected = selected === opt.word;
                    
                    let btnStyle = "bg-slate-900/50 border-slate-800 text-slate-300";
                    if (isSelected) {
                      btnStyle = isAnswer ? "bg-emerald-900/40 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-red-900/40 border-red-500 text-red-400";
                    } else if (selected && isAnswer) {
                      btnStyle = "bg-emerald-900/20 border-emerald-500/50 text-emerald-500/70";
                    }

                    return (
                      <button
                        key={i}
                        disabled={!!selected}
                        onClick={() => handleSelect(opt.word)}
                        className={`group relative p-5 rounded-2xl border text-left transition-all duration-300 active:scale-[0.98] ${btnStyle}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <span className="text-lg font-black tracking-tight block">{opt.word}</span>
                            {selected && (
                              <motion.span 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                className="text-sm font-bold text-slate-500 uppercase tracking-widest block"
                              >
                                {opt.meaning}
                              </motion.span>
                            )}
                          </div>
                          {isSelected && (
                            isAnswer ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-1" /> : <XCircle className="w-5 h-5 text-red-500 mt-1" />
                          )}
                          {selected && isAnswer && !isSelected && <CheckCircle2 className="w-5 h-5 opacity-50 mt-1" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selected && currentQ.analysis && (
                  <div className="space-y-4">
                    <button 
                      onClick={() => setShowAnalysis(!showAnalysis)}
                      className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center space-x-2 hover:text-indigo-300 transition-colors"
                    >
                      <Sparkles size={12} />
                      <span>{showAnalysis ? "隱藏神卷解析" : "點擊查看神卷解析"}</span>
                    </button>
                    
                    <AnimatePresence>
                      {showAnalysis && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-slate-400 text-sm leading-relaxed font-medium">
                            {currentQ.analysis}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {selected && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent z-50">
          <div className="max-w-2xl mx-auto">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={nextAction}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl flex items-center justify-center space-x-2 shadow-xl shadow-indigo-500/20"
            >
              <span>{qIdx + 1 >= totalQuestions ? '領取修為' : '參悟下一卷'}</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
