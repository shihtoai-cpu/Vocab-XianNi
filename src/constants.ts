/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AncientRealm, RealmInfo } from './types';

const QI = Array.from({ length: 15 }, (_, i) => `凝氣期${i + 1}層`);
const STAGES = ["初期", "中期", "後期", "後期巔峰", "圓滿"];
const REALMS_DEF = [
    { n: "凡人", s: ["一介凡夫"], c: "text-slate-500" },
    { n: "凝氣", s: QI, c: "text-emerald-400" },
    { n: "築基", s: [...STAGES, "假丹"], c: "text-blue-400" },
    { n: "結丹", s: [...STAGES, "假嬰"], c: "text-purple-400" },
    { n: "元嬰", s: STAGES, c: "text-pink-400" },
    { n: "化神", s: STAGES, c: "text-orange-400" },
    { n: "嬰變", s: STAGES, c: "text-rose-500" },
    { n: "問鼎", s: STAGES, c: "text-amber-500" },
    { n: "陰虛", s: STAGES, c: "text-indigo-500" },
    { n: "陽實", s: STAGES, c: "text-yellow-500" },
    { n: "窺涅", s: STAGES, c: "text-cyan-400" },
    { n: "淨涅", s: STAGES, c: "text-sky-400" },
    { n: "碎涅", s: STAGES, c: "text-indigo-400" },
    { n: "空涅", s: STAGES, c: "text-blue-600" },
    { n: "空靈", s: STAGES, c: "text-purple-600" },
    { n: "空玄", s: STAGES, c: "text-rose-600" },
    { n: "空劫", s: ["大尊初期", "大尊中期", "大尊後期", "金尊", "天尊", "躍天尊"], c: "text-red-700" },
    { n: "半步踏天", s: ["第一橋", "第二橋", "第三橋", "第四橋", "第五橋", "第六橋", "第七橋", "第八橋"], c: "text-yellow-500 font-bold" },
    { n: "踏天境", s: ["第九橋(圓滿)", "一轉", "二轉", "三轉", "四轉", "五轉", "六轉", "七轉", "八轉", "九轉"], c: "text-yellow-200 font-black" }
];

export const ALL_SUB = REALMS_DEF.flatMap(r => r.s.map(s => ({ m: r.n, s, c: r.c })));

export const getRealmInfo = (exp: number): RealmInfo => {
    let acc = 0;
    const totalCount = ALL_SUB.length;
    
    // Find the index of "半步踏天 第一橋"
    const bridgeIndex = ALL_SUB.findIndex(sub => sub.m === "半步踏天" && sub.s === "第一橋");
    
    for (let i = 0; i < totalCount; i++) {
        let req = 0;
        
        if (i < bridgeIndex) {
            // Early stages: Very smooth progression.
            // Level 0: 100 XP
            // Level 60: 100 + 60*20 = 1300 XP
            // This ensures characters reach high levels (空劫) with ~50k-70k XP.
            req = 100 + (i * 20);
        } else if (ALL_SUB[i].m === "半步踏天") {
            // Bridges: The real challenge starts here.
            // 8 bridges * 12k = 96k XP.
            // Total word count target 8000-10000. 
            // Total available XP in game ~150k-200k.
            req = 12000; 
        } else {
            // 踏天境 Rotations (二轉, etc.) - Eternal progression
            req = 30000 + ((i - bridgeIndex) * 10000);
        }

        if (exp < acc + req) return { ...ALL_SUB[i], idx: i, current: acc, next: acc + req };
        acc += req;
    }
    return { ...ALL_SUB[totalCount - 1], idx: totalCount - 1, current: acc, next: Infinity };
};

export const ANCIENT_REALMS: AncientRealm[] = [
    { n: "半星古神", pts: 0, c: "text-slate-400", masteredReq: 0 },
    { n: "一星古神", pts: 1000, c: "text-orange-300", masteredReq: 5 },
    { n: "二星古神", pts: 5000, c: "text-orange-400", masteredReq: 20 },
    { n: "三星古神", pts: 15000, c: "text-orange-500", masteredReq: 50 },
    { n: "四星古神", pts: 40000, c: "text-red-400", masteredReq: 120 },
    { n: "五星古神", pts: 100000, c: "text-red-500", masteredReq: 250 },
    { n: "六星古神", pts: 250000, c: "text-purple-500", masteredReq: 500 },
    { n: "七星古神", pts: 600000, c: "text-pink-500", masteredReq: 1000 },
    { n: "八星古神", pts: 1500000, c: "text-yellow-400 animate-pulse", masteredReq: 2000 },
    { n: "九星古神", pts: 5000000, c: "text-yellow-200 animate-pulse", masteredReq: 5000 }
];

export const getAncientRealm = (exp: number, masteredCount: number = 0): AncientRealm => {
    for (let i = ANCIENT_REALMS.length - 1; i >= 0; i--) {
        const realm = ANCIENT_REALMS[i];
        if (exp >= realm.pts && masteredCount >= (realm.masteredReq || 0)) {
            return realm;
        }
    }
    return ANCIENT_REALMS[0];
};

export const getMasteredPrefix = (masteredCount: number): string => {
    if (masteredCount >= 10000) return "聖";
    if (masteredCount >= 5000) return "玄";
    if (masteredCount >= 2000) return "極";
    if (masteredCount >= 1000) return "真";
    return "";
};

export const autoCategorize = (zh: string) => {
    const dict: Record<string, string[]> = {
        "動物": ["虎", "狼", "龍", "鳥", "獸", "馬", "羊", "犬", "貓", "魚", "蟲", "象", "獅"],
        "植物": ["花", "草", "樹", "林", "木", "葉", "果", "藥", "根", "枝", "卉"],
        "交通": ["車", "船", "飛機", "路", "徑", "航", "運", "站", "港", "速"],
        "食物": ["飯", "麵", "肉", "菜", "飲", "食", "味", "甜", "鹹", "餐", "米", "麥"],
        "天氣": ["風", "雨", "雷", "電", "雲", "雪", "晴", "氣", "霧", "霜", "露", "虹"],
        "時間": ["年", "月", "日", "時", "分", "秒", "早", "晚", "昔", "今", "永", "暫"],
        "情緒": ["怒", "喜", "憂", "傷", "愛", "恨", "驚", "恐", "悲", "樂", "愁", "願"],
        "動作": ["跑", "跳", "走", "看", "說", "打", "取", "修", "聽", "讀", "寫", "飛", "遁"],
        "物品": ["桌", "椅", "筆", "劍", "器", "具", "服", "物", "寶", "珠", "鏡", "爐"],
        "自然": ["山", "川", "河", "海", "陸", "石", "土", "金", "火", "水", "星", "月"],
        "學術": ["書", "考", "文", "學", "理", "算", "術", "史", "法", "論", "道"],
        "空間": ["大", "小", "遠", "近", "高", "低", "前", "後", "左", "右", "內", "外"]
    };
    for (let cat in dict) {
        if (dict[cat].some(k => zh.includes(k))) return cat;
    }
    return "其他類別";
};
