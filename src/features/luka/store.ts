// 후기자돈사(루카) 자료 — 기존 루카 현황판과 같은 Firestore(luka-piglets)를 그대로 읽고 쓴다 (두 화면이 실시간으로 같음)
// 설정값은 공개되어도 되는 값 (루카 현황판 index.html과 같음)
import { useEffect, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc, collection, query, orderBy, limit, addDoc, deleteDoc, getDocs, type Firestore } from 'firebase/firestore';

const CFG = { apiKey: 'AIzaSyD16GVE23OVqodlFHx8h1e0FhWFDz2wLL8', authDomain: 'luka-piglets.firebaseapp.com', projectId: 'luka-piglets', storageBucket: 'luka-piglets.firebasestorage.app', messagingSenderId: '895417903466', appId: '1:895417903466:web:61e31bdc49d805dbc81d13' };
let db: Firestore | null = null;
const fs = () => { if (!db) db = getFirestore(getApps().find((a) => a.name === 'luka') ?? initializeApp(CFG, 'luka')); return db; };

export type Row = Record<string, any>;
export interface LukaSettings { defaultWeeklyDeath: number; weeklyDeaths: Record<string, number | string>; lukaStatusRows: Row[]; reshipRows: Row[]; feedCostRows: Row[]; simScenarios: Row[] }
export interface LukaRec { id: string; date: string; type: 'in' | 'out'; subtype?: 'farm' | 'external' | null; farmName?: string; head: number }
const blank = (): LukaSettings => ({ defaultWeeklyDeath: 20, weeklyDeaths: {}, lukaStatusRows: [], reshipRows: [], feedCostRows: [], simScenarios: [] });

export function useLuka() {
  const [settings, setSettings] = useState<LukaSettings>(blank());
  const [records, setRecords] = useState<LukaRec[]>([]);
  const [state, setState] = useState<'wait' | 'ok' | 'err'>('wait');
  useEffect(() => {
    const u1 = onSnapshot(doc(fs(), 'settings/main'), (s) => { if (s.metadata.fromCache && !s.exists()) return; setSettings({ ...blank(), ...(s.data() ?? {}) }); setState('ok'); }, () => setState('err'));
    const u2 = onSnapshot(query(collection(fs(), 'records'), orderBy('date', 'asc'), limit(1000)), (s) => setRecords(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LukaRec, 'id'>) }))), () => setState('err'));
    return () => { u1(); u2(); };
  }, []);
  return {
    settings, records, state,
    // 바꾼 칸만 합쳐 저장 (다른 칸을 덮어쓰지 않게) — 루카 현황판과 같은 방식
    saveSettings: (patch: Partial<LukaSettings>) => setDoc(doc(fs(), 'settings/main'), patch, { merge: true }),
    addRecord: (r: Omit<LukaRec, 'id'>) => addDoc(collection(fs(), 'records'), r),
    deleteRecord: (id: string) => deleteDoc(doc(fs(), 'records/' + id)),
    setHead: (id: string, head: number) => setDoc(doc(fs(), 'records/' + id), { head }, { merge: true }),
    // 엑셀 불러오기: 입력 내역 전체 교체 (루카 현황판과 같은 동작)
    replaceAll: async (L: Omit<LukaRec, 'id'>[]) => { const s = await getDocs(collection(fs(), 'records')); await Promise.all(s.docs.map((d) => deleteDoc(d.ref))); await Promise.all(L.map((r) => addDoc(collection(fs(), 'records'), r))); }
  };
}
