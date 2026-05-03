import { User } from '../types';

export const STAMINA_RECOVERY_TIME = {
  JING: 180, // 3 minutes per point (180s)
  QI: 600,   // 10 minutes per point (600s)
  SHEN: 1800 // 30 minutes per point (1800s)
};

export function calculateRecovery(user: User): User {
  const now = Date.now();
  
  // 1. 初始化與修正舊數據 (Migration & Sanitization)
  const maxJing = user.maxJing || 20;
  const maxQi = user.maxQi || 20;
  const maxShen = user.maxShen || 20;

  // 核心遷移邏輯：
  // 如果 totalExp/totalAncientExp 是 undefined，說明是舊資料，需要從 exp/ancientExp 遷移
  const totalExp = user.totalExp !== undefined ? user.totalExp : (user.exp || 0);
  const totalAncientExp = user.totalAncientExp !== undefined ? user.totalAncientExp : (user.ancientExp || 0);

  // 當前體力值初始化
  let currentJing = user.jing !== undefined ? user.jing : (user.exp || maxJing);
  let currentQi = user.qi !== undefined ? user.qi : (user.ancientExp || maxQi);
  let currentShen = user.shen !== undefined ? user.shen : (user.stats.spirit || maxShen);

  // 強制糾正超標數據：當前體力不可超過上限，若超過則視為舊累積數據，強制降回上限
  if (currentJing > maxJing) currentJing = maxJing;
  if (currentQi > maxQi) currentQi = maxQi;
  if (currentShen > maxShen) currentShen = maxShen;

  const isMigrating = user.totalExp === undefined || user.jing === undefined || user.qi === undefined || user.shen === undefined || user.jing > maxJing || user.qi > maxQi || user.shen > maxShen;

  if (!user.lastRefresh || isMigrating) {
    return {
      ...user,
      jing: currentJing,
      qi: currentQi,
      shen: currentShen,
      maxJing,
      maxQi,
      maxShen,
      totalExp,
      totalAncientExp,
      lastRefresh: user.lastRefresh || now
    };
  }

  const elapsedSeconds = Math.floor((now - user.lastRefresh) / 1000);
  if (elapsedSeconds < 60) {
    // 即使時間未到，如果數據有修正（超標糾正），也需要回傳更新
    if (currentJing !== user.jing || currentQi !== user.qi || currentShen !== user.shen) {
      return { ...user, jing: currentJing, qi: currentQi, shen: currentShen };
    }
    return user;
  }

  const newJing = calculateStat(currentJing, maxJing, elapsedSeconds, STAMINA_RECOVERY_TIME.JING);
  const newQi = calculateStat(currentQi, maxQi, elapsedSeconds, STAMINA_RECOVERY_TIME.QI);
  const newShen = calculateStat(currentShen, maxShen, elapsedSeconds, STAMINA_RECOVERY_TIME.SHEN);

  // If any stat changed, update lastRefresh
  const hasChanged = newJing !== user.jing || newQi !== user.qi || newShen !== user.shen || user.totalExp === undefined;

  if (hasChanged) {
     return {
       ...user,
       jing: newJing,
       qi: newQi,
       shen: newShen,
       maxJing,
       maxQi,
       maxShen,
       totalExp,
       totalAncientExp,
       lastRefresh: now
     };
  }

  return user;
}

function calculateStat(current: number, max: number, elapsed: number, rate: number): number {
  if (current >= max) return current;
  const recovered = Math.floor(elapsed / rate);
  return Math.min(max, current + recovered);
}

export function consumeStamina(user: User, type: 'jing' | 'qi' | 'shen', amount: number = 1): User | null {
  const updatedUser = { ...user };
  
  if (type === 'jing') {
    if (updatedUser.jing < amount) return null;
    updatedUser.jing -= amount;
  } else if (type === 'qi') {
    if (updatedUser.qi < amount) return null;
    updatedUser.qi -= amount;
  } else if (type === 'shen') {
    if (updatedUser.shen < amount) return null;
    updatedUser.shen -= amount;
  }

  return updatedUser;
}
