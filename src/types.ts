/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Word {
  en: string;
  zh: string;
  pos: string;
  cat: string;
  bid: number;
}

export interface Batch {
  id: number;
  d: string; // date string
  c: number; // count
}

export interface AppSettings {
  rounds: number;
  questions: number;
  errors: number;
  adminPw: string;
}

export interface UserStats {
  rounds: number;
  lastDate: string;
  wordStats?: Record<string, number>;
  wordHistory?: Record<string, { c: number; w: number }>; // c: correct, w: wrong
}

export interface User {
  id?: string;
  name: string;
  pw: string;
  avatar: string;
  avatarSize?: number; 
  avatarX?: number; 
  avatarY?: number; 
  totalExp: number; // 永久累積的分身修為
  totalAncientExp: number; // 永久累積的本尊神識
  jing: number; // 當前精 (Meat body/Stamina)
  qi: number; // 當前氣 (Spiritual/Stamina)
  shen: number; // 當前神 (Mental/Stamina)
  maxJing: number;
  maxQi: number;
  maxShen: number;
  lastRefresh?: number; // 最後一次恢復計算的時間戳
  realm?: string;
  items?: {
    bloodPill: number; // 氣血丹
    qiPill: number; // 聚靈丹
    spiritPill: number; // 養神丹
    spiritJade: number; // 仙玉
  };
  rotations?: number; 
  isMaster?: boolean;
  recoveryPw?: string;
  stats: UserStats;
}

export interface RealmInfo {
  m: string; // main realm name
  s: string; // sub realm name
  c: string; // color class
  idx: number;
  current: number;
  next: number;
}

export interface AncientRealm {
  n: string;
  pts: number;
  c: string;
  masteredReq?: number; // 精熟單字要求
}
