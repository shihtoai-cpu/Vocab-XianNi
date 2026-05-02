/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface HandwritingEngineProps {
  word: string;
  zh: string;
  pos?: string; // 增加詞性屬性
  onResult: (ok: boolean, pts: number) => void;
  onBack: () => void;
}

export default function HandwritingEngine({ word, zh, pos, onResult, onBack }: HandwritingEngineProps) {
  const [input, setInput] = useState("");
  const [isError, setIsError] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { 
    inputRef.current?.focus(); 
  }, []);

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (isRevealing) return;
    let val = e.target.value;
    
    // 自動跳過空格、連字號或其他非字母符號
    if (val.length < word.length) {
      const nextChar = word[val.length];
      // 如果下一個字元不是字母且不是空格，或是空格且我們正在往前輸入
      if (val.length >= input.length && (nextChar === " " || /[^a-zA-Z]/.test(nextChar))) {
        val += nextChar;
        // 連鎖判斷：如果跳過後下一個還是特殊字元，遞迴處理 (這裡簡單處理下一個)
        if (val.length < word.length) {
          const skipNext = word[val.length];
          if (skipNext === " " || /[^a-zA-Z]/.test(skipNext)) {
            val += skipNext;
          }
        }
      }
    }
    
    setInput(val);
    setIsError(false);
  };

  const submit = () => {
    if (isRevealing) return;
    if (input.length === 0) return;
    
    const isCorrect = input.toLowerCase() === word.toLowerCase();
    setIsRevealing(true);
    
    if (isCorrect) {
      setTimeout(() => {
        onResult(true, 50);
        setInput("");
        setIsRevealing(false);
      }, 700);
    } else {
      setIsError(true);
    }
  };

  const proceedAfterError = () => {
    onResult(false, 0); 
    setInput("");
    setIsRevealing(false);
    setIsError(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (isError && isRevealing) {
        proceedAfterError();
      } else if (input.length > 0) {
        submit();
      }
    } else if (e.key === "Backspace" && input.length > 0) {
       // 如果前一個字元是自動填入的特殊符號，退格時要一併刪除
       const prevChar = word[input.length - 1];
       if (prevChar === " " || /[^a-zA-Z]/.test(prevChar)) {
         setInput(input.slice(0, -1));
       }
    }
  };

  return (
    <div 
        className="flex-1 flex flex-col items-center justify-center p-6 space-y-12" 
        onClick={() => inputRef.current?.focus()}
    >
      <input 
        ref={inputRef} 
        type="text" 
        className="absolute opacity-0 pointer-events-none" 
        value={input} 
        onChange={handleInput} 
        onKeyDown={handleKeyDown} 
        autoFocus 
      />
      
      <div className="text-center space-y-4">
        <p className="text-indigo-400 text-[10px] tracking-[0.5em] font-black uppercase">本尊古神修煉 · 神識刻印</p>
        <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tighter max-w-2xl mx-auto drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{zh}</h2>
        {pos && (
          <div className="mt-6 inline-block px-3 py-1 bg-blue-600/30 border border-blue-500/40 rounded text-sm font-black text-blue-300 uppercase tracking-widest">
            {pos}
          </div>
        )}
      </div>

      <div className="w-full max-w-full px-2 py-10 relative">
        <AnimatePresence>
          {isRevealing && !isError && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-x-0 -top-8 flex justify-center z-20 pointer-events-none"
            >
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-8 py-3 rounded-full font-black text-xl shadow-[0_0_40px_rgba(245,158,11,0.6)] border-4 border-white/20">
                神識契合！完美！
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-nowrap justify-center items-end gap-x-0.5 sm:gap-x-1 w-full overflow-visible">
          {word.split("").map((char, i) => {
            const isSymbol = char !== " " && /[^a-zA-Z]/.test(char);
            if (char === " ") return <div key={i} className="flex-1 max-w-[1.5rem] min-w-[0.5rem]" />;
            
            const isCurrent = !isRevealing && input.length === i;
            const filledChar = input[i];
            const correctChar = word[i];
            
            // 完美的動態縮放：強制在容器內縮放，絕不換行
            const len = word.length;
            let maxWidth = "max-w-[44px]";
            let fontSize = "text-4xl md:text-6xl";
            
            if (len > 30) {
              maxWidth = "max-w-[10px]";
              fontSize = "text-[9px] md:text-lg";
            } else if (len > 25) {
              maxWidth = "max-w-[12px]";
              fontSize = "text-xs md:text-xl";
            } else if (len > 20) {
              maxWidth = "max-w-[18px]";
              fontSize = "text-base md:text-2xl";
            } else if (len > 15) {
              maxWidth = "max-w-[24px]";
              fontSize = "text-xl md:text-3xl";
            } else if (len > 10) {
              maxWidth = "max-w-[32px]";
              fontSize = "text-2xl md:text-5xl";
            }

            return (
              <div key={i} className={`flex-1 flex flex-col items-center ${maxWidth} min-w-0 transition-all duration-500`}>
                <span className={`${fontSize} font-black mb-1 h-12 md:h-20 font-mono transition-all duration-300 flex items-center justify-center ${
                  isRevealing 
                    ? (isError ? 'text-red-500 scale-110' : 'text-yellow-400')
                    : (isCurrent ? 'animate-pulse text-indigo-400' : 'text-white')
                }`}>
                  {isSymbol ? char : (isRevealing && isError ? correctChar : (filledChar || ""))}
                </span>
                {!isSymbol && (
                  <div className={`h-1 w-full transition-all duration-300 ${
                    isError 
                      ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]' 
                      : (isRevealing ? 'bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.8)]' : (filledChar ? 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]' : 'bg-slate-800'))
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center min-h-[80px]">
        {isError && isRevealing ? (
          <button 
            onClick={proceedAfterError}
            className="flex flex-col items-center space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <span className="text-red-500/80 text-[10px] font-bold uppercase tracking-widest animate-pulse">神識偏差 · 記下正解</span>
            <div className="bg-red-500 text-white px-10 py-3 rounded-full font-bold text-sm tracking-widest hover:bg-red-600 transition-all shadow-[0_0_25px_rgba(239,68,68,0.4)] active:scale-95">
              繼續下個試煉 (Enter)
            </div>
          </button>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <p className="text-slate-600 text-[10px] tracking-widest uppercase font-bold">
              {isRevealing ? "印入魂海" : `請輸入「${word.length}」個字母後提交`}
            </p>
            {!isRevealing && (
              <button 
                onClick={onBack} 
                className="text-[10px] font-bold text-slate-500 border border-slate-800 px-6 py-2 rounded uppercase tracking-widest hover:text-white transition-colors"
              >
                中斷逆練
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
