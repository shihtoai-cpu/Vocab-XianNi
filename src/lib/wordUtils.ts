/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Word } from '../types';

/**
 * Merges a list of words by their English text.
 * Chinese meanings are joined with a separator.
 */
export const mergeWords = (words: Word[]): Word[] => {
  if (!words || !Array.isArray(words)) return [];
  
  const mergedMap = new Map<string, Word & { meanings: Set<string>; bids: Set<number> }>();

  for (const w of words) {
    const key = w.en.toLowerCase();
    const existing = mergedMap.get(key);
    
    if (existing) {
      existing.meanings.add(w.zh);
      existing.bids.add(w.bid);
      // We keep the original 'en' casing from the first occurrence
    } else {
      mergedMap.set(key, {
        ...w,
        meanings: new Set([w.zh]),
        bids: new Set([w.bid])
      });
    }
  }

  return Array.from(mergedMap.values()).map(m => ({
    en: m.en,
    zh: Array.from(m.meanings).join('；'),
    pos: m.pos,
    cat: m.cat,
    bid: Array.from(m.bids)[0] // Provide one bid for compatibility
  }));
};
