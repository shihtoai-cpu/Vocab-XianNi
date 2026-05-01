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
  spirit: number;
  lastDate: string;
  wordStats?: Record<string, number>;
  wordHistory?: Record<string, { c: number; w: number }>; // c: correct, w: wrong
}

export interface User {
  id?: string;
  name: string;
  pw: string;
  avatar: string;
  avatarSize?: number; // Size in px
  avatarX?: number; // Offset X
  avatarY?: number; // Offset Y
  exp: number;
  ancientExp?: number;
  rotations?: number; // 轉數 (涅槃重修次數)
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
