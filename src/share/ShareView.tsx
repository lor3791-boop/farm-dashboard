// 농장 공유 화면 본체 — 사장님·직원이 함께 보는 한 농장 화면. 한국어/네팔어.
// 대시보드 미리보기와 공유 사이트가 같은 화면을 쓴다. (이 파일은 대시보드 코드를 가져오지 않는다)
import { useRef, useState } from 'react';
import { shrinkImage } from '@/lib/image';
import type { SharePayload, ShareGroup } from './payload';
import { applyDeaths, survOf } from './applyDeaths';

const KO = { tabHome: '홈', tabStatus: '돈군', tabDeath: '폐사 등록', tabShip: '출하', tabTask: '작업', stock: '현재 두수', groups: '돈군', deathAll: '누적 폐사', matrix: '돈군별 주차 폐사', month: '개월차', wk: '주', issue: '이번 주 확인할 것', inn: '전입', death: '폐사', sold: '출하', surv: '육성률', photo: '폐사 사진', addPhoto: '사진', dong: '어느 동인가요?', group: '어느 그룹인가요?', auto: '자동 연결', count: '몇 두인가요?', unit: '두', save: '등록', saved: '등록했습니다', recent: '최근 등록', heads: '두수', avgw: '평균체중', out: '등외', avgTitle: '평균 출하 성적', aN: '출하두수', aW: '평균체중', aYield: '지육율', aGrade: '등급율 (1+·1)', g1p: '1+ 등급', aOut: '등외', times: '회', recentShip: '최근 출하', date: '날짜', yield: '지육율', jobDew: '구충제 · 사료 2호 변경', jobFmd: '구제역 백신', farmSfx: ' 농장', asOf: (d: string) => d + ' 기준', noIssue: '특별히 확인할 것이 없습니다', iDeath: (g: string, d: string, w: number, n: number) => `${g} (${d}): ${w}주차에 ${n}두 폐사 → 원인 확인`, iJob: (g: string, d: string, dt: string, j: string) => `${g} (${d}): ${dt} ${j}`, meta: (d: string, a: number, w: number) => `${d} 전입 · ${a}일령 · ${w}주차`, shipTotal: (g: string, s: number, k: number) => `${g}: 지금까지 ${s}두 출하 · ${k}두 남음`, avgSub: (f: string, t: string, n: number) => `${f}~${t} · ${n}회 출하`, noShip: '아직 출하가 없습니다', noTask: '예정된 작업이 없습니다', fail: '등록하지 못했습니다. 인터넷 연결을 확인하세요', list: '등록한 폐사', edit: '수정', cancel: '취소', keep: '저장', del: '삭제', dongGroup: '동 (그룹)', when: '날짜', more: '더 보기', none: '등록한 폐사가 없습니다', edited: '수정했습니다', done: '확인 완료', dIn: '폐사입력', dSt: '폐사현황', after: '등록하면', recentDays: '최근 7일 등록', dayTot: (n: number) => `합계 ${n}두`, days: (n: number) => `${n}일`, periodTot: (n: number, d: number) => `${d}일 동안 ${n}두` };
const NE: typeof KO = { tabHome: 'होम', tabStatus: 'बंगुर समूह', tabDeath: 'मरेको दर्ता', tabShip: 'बिक्री', tabTask: 'काम', stock: 'अहिले भएका बंगुर', groups: 'समूह', deathAll: 'जम्मा मरेका', matrix: 'हप्ता अनुसार मरेका बंगुर', month: 'महिना', wk: 'हप्ता', issue: 'यो हप्ता हेर्नुपर्ने कुरा', inn: 'ल्याएको', death: 'मरेको', sold: 'बिक्री', surv: 'बाँचेको', photo: 'मरेको बंगुरको फोटो', addPhoto: 'फोटो', dong: 'कुन खोर (동)?', group: 'कुन समूह?', auto: 'समूह आफैं मिल्यो', count: 'कति वटा?', unit: 'वटा', save: 'दर्ता गर्नुहोस्', saved: 'दर्ता भयो', recent: 'भर्खरको दर्ता', heads: 'संख्या', avgw: 'औसत तौल', out: 'ग्रेड बाहिर', avgTitle: 'बिक्रीको औसत नतिजा', aN: 'बिक्री संख्या', aW: 'औसत तौल', aYield: 'मासु प्रतिशत', aGrade: 'ग्रेड 1+ र 1', g1p: 'ग्रेड 1+', aOut: 'ग्रेड बाहिर', times: 'पटक', recentShip: 'हालको बिक्री', date: 'मिति', yield: 'मासु %', jobDew: 'जुकाको औषधि · दाना 2 नम्बर', jobFmd: 'खोरेत खोप', farmSfx: ' फार्म', asOf: (d) => d + ' सम्मको', noIssue: 'विशेष हेर्नुपर्ने कुरा छैन', iDeath: (g, d, w, n) => `${g} (${d}): हप्ता ${w} मा ${n} वटा मरे → कारण हेर्नुहोस्`, iJob: (g, d, dt, j) => `${g} (${d}): ${dt} मा ${j}`, meta: (d, a, w) => `${d} मा ल्याएको · ${a} दिनको · हप्ता ${w}`, shipTotal: (g, s, k) => `${g}: अहिलेसम्म ${s} वटा बिक्री · ${k} वटा बाँकी`, avgSub: (f, t, n) => `${f}~${t} · ${n} पटक बिक्री`, noShip: 'अहिलेसम्म बिक्री छैन', noTask: 'कुनै काम छैन', fail: 'दर्ता भएन। इन्टरनेट जाँच गर्नुहोस्', list: 'दर्ता गरिएका मरेका', edit: 'सच्याउनुहोस्', cancel: 'रद्द', keep: 'सेभ', del: 'हटाउनुहोस्', dongGroup: 'खोर (समूह)', when: 'मिति', more: 'अझै हेर्नुहोस्', none: 'दर्ता छैन', edited: 'सच्याइयो', done: 'जाँच भयो', dIn: 'मरेको दर्ता', dSt: 'मरेको हिसाब', after: 'दर्ता पछि', recentDays: 'पछिल्लो ७ दिनको दर्ता', dayTot: (n) => `जम्मा ${n} वटा`, days: (n) => `${n} दिन`, periodTot: (n, d) => `${d} दिनमा ${n} वटा` };

const addIso = (d: string, n: number) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const md = (s: string) => s.slice(5).replace('-', '/');
const short = (s: string) => s.slice(5).split('-').map(Number).join('/');
const r1 = (x: number) => Math.round(x * 10) / 10;
const dongsOf = (s: string) => (s === '—' ? [] : s.replace('동', '').split('·'));
const dongLbl = (d: string) => (d === '—' ? '' : d);
function heat(v: number | null) {
  if (v === null) return { bg: 'transparent', fg: '#9A958B' };
  if (v === 0) return { bg: '#EEF3EF', fg: '#6B7A73' };
  if (v <= 2) return { bg: '#FBE7C6', fg: '#5A3A00' };
  if (v <= 5) return { bg: '#F2B27E', fg: '#3D1F00' };
  if (v <= 9) return { bg: '#D9773F', fg: '#FFFFFF' };
  return { bg: '#9A3216', fg: '#FFFFFF' };
}

export interface DeathInput { date: string; dong: string; group: string; count: number; photos?: string[] }
export interface ShareDeath extends DeathInput { id: string; checked: boolean; at?: string }

// 동·그룹 선택지: '3동 · 26-7' (동 없이 관리하는 그룹은 그룹만)
export const dongGroupOpts = (G: { group: string; dong: string }[]) => G.flatMap((r) => { const ds = dongsOf(r.dong); return ds.length ? ds.map((d) => ({ v: d + '|' + r.group, l: d + '동 · ' + r.group })) : [{ v: '|' + r.group, l: r.group }]; });

export function ShareView({ p, deaths = [], onSaveDeath, onEditDeath }: { p: SharePayload; deaths?: ShareDeath[]; onSaveDeath: (d: DeathInput) => Promise<void>; onEditDeath?: (id: string, d: DeathInput) => Promise<void> }) {
  const [lang, setLang] = useState<'ko' | 'ne'>('ko');
  const [tab, setTab] = useState<'home' | 'status' | 'death' | 'ship' | 'task'>('home');
  const [dong, setDong] = useState<string | null>(null);
  const [grp, setGrp] = useState<string | null>(null);
  const [cnt, setCnt] = useState(1);
  const [saved, setSaved] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // 폐사 사진 — 줄여서(장당 200KB 이하) 폐사 기록에 같이 저장, 3장까지
  const [photos, setPhotos] = useState<string[]>([]);
  const pref = useRef<HTMLInputElement>(null);
  const addPhotos = async (L: FileList) => {
    const out: string[] = [];
    try { for (const f of [...L].slice(0, 3 - photos.length)) out.push(await shrinkImage(f, 200 * 1024, [[1280, 0.7], [1024, 0.6], [800, 0.55], [640, 0.5]])); }
    catch (e) { setSaved({ ok: false, t: (e as Error).message }); }
    setPhotos((x) => [...x, ...out].slice(0, 3));
  };
  const [recent, setRecent] = useState<{ date: string; dong: string; group: string; n: number }[]>([]);
  const [day, setDay] = useState(p.today);
  const [ed, setEd] = useState<{ id: string; date: string; dg: string; count: string } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [dTab, setDTab] = useState<'in' | 'st'>('in');
  const [range, setRange] = useState(7);
  const t = lang === 'ko' ? KO : NE;
  // 이 농장 앱에서 등록한 폐사를 기준값에 더한다 (크레임 먼저 차감)
  const base: Record<string, { death: number; stock: number; claimLeft: number }> = {};
  p.groups.forEach((r) => { base[r.group] = { death: r.death, stock: r.stock, claimLeft: r.claimLeft ?? 0 }; });
  const sp = applyDeaths(base, deaths.map((d) => ({ ...d, farm: p.farm })), p.asOf, (d) => d.group);
  const G: ShareGroup[] = p.groups.map((r) => {
    const b = base[r.group], weekly = [...r.weekly];
    deaths.forEach((d) => { const x = sp[d.id]; if (!x || !x.death || d.group !== r.group) return; const w = Math.floor((Date.parse(d.date) - Date.parse(r.date)) / 6048e5); if (w < 0) return; while (weekly.length <= w) weekly.push(0); weekly[w] += x.death; });
    const surv = survOf(r.net, b.death);
    return { ...r, death: b.death, stock: b.stock, claimLeft: b.claimLeft, surv, bad: surv < (p.badPct ?? 94), weekly, week: Math.max(r.week, weekly.length) };
  });
  const noDong = G.every((r) => r.dong === '—');
  const dongs = [...new Set(G.flatMap((r) => dongsOf(r.dong)))].sort();
  // 동 있는 그룹과 동 없는 그룹이 섞이면 '동 없음'(dong === '')을 따로 보여준다
  const plain = G.filter((r) => !dongsOf(r.dong).length);
  const cover = noDong ? G : dong === '' ? plain : G.filter((r) => dong !== null && dongsOf(r.dong).includes(dong));
  const chosen = !noDong && cover.length === 1 ? cover[0].group : grp;
  const today = p.today, todayMd = today.slice(5), weekEnd = addIso(today, 6).slice(5), weekAgo = addIso(today, -7).slice(5);

  const maxW = Math.max(1, ...G.map((r) => r.week)), CW = 28, GP = 3, BG = 8;
  const bands: { label: string; w: number; ml: number; bg: string }[] = [], wcols: { n: number; ml: number }[] = [];
  for (let b = 0; b < Math.ceil(maxW / 4); b++) { const ws: number[] = []; for (let n = b * 4 + 1; n <= Math.min(maxW, b * 4 + 4); n++) ws.push(n);
    bands.push({ label: lang === 'ko' ? b + 1 + t.month : t.month + ' ' + (b + 1), w: ws.length * CW + (ws.length - 1) * GP, ml: b ? BG : 0, bg: b % 2 ? '#F1EEE6' : '#E6EFE9' });
    ws.forEach((n, i) => wcols.push({ n, ml: b && i === 0 ? BG : 0 })); }

  const tasks = p.tasks.filter((k) => k.d >= weekAgo).sort((a, b) => (a.d < b.d ? -1 : 1));
  const issues: string[] = [];
  G.forEach((r) => { const from = Math.max(0, r.week - 5); r.weekly.slice(from).forEach((v, i) => { if (v >= 5) issues.push(t.iDeath(r.group, dongLbl(r.dong) || '—', from + i + 1, v)); }); });
  tasks.filter((k) => k.d >= todayMd && k.d <= weekEnd).forEach((k) => issues.push(t.iJob(k.group, dongLbl(k.dong) || '—', k.d.replace('-', '/'), k.fmd ? t.jobFmd : t.jobDew)));

  const S = p.ships;
  const n = S.reduce((a, x) => a + x.n, 0);
  const wsum = S.reduce((a, x) => a + (x.w ?? 0) * x.n, 0);
  const ysum = S.reduce((a, x) => a + (x.y ?? 0) * (x.w ?? 0) * x.n, 0);
  const g1p = S.reduce((a, x) => a + x.a, 0), g1 = S.reduce((a, x) => a + x.b, 0), out = S.reduce((a, x) => a + x.o, 0);
  const avg: [string, string, string][] = [[t.aN, n.toLocaleString(), S.length + ' ' + t.times], [t.aW, n ? r1(wsum / n) + 'kg' : '—', ''], [t.aYield, wsum ? r1(ysum / wsum) + '%' : '—', ''], [t.aGrade, n ? r1(((g1p + g1) / n) * 100) + '%' : '—', ''], [t.g1p, n ? r1((g1p / n) * 100) + '%' : '—', ''], [t.aOut, String(out), n ? r1((out / n) * 100) + '%' : '']];

  const save = async () => {
    if (!chosen || busy) return;
    setBusy(true);
    try {
      await onSaveDeath({ date: day, dong: dong ?? '', group: chosen, count: cnt, ...(photos.length ? { photos } : {}) });
      setPhotos([]);
      setSaved({ ok: true, t: t.saved + ' · ' + (dong ? dong + '동 ' : '') + '(' + chosen + ') · ' + cnt + ' ' + t.unit });
      setRecent([{ date: md(day), dong: dong ? dong + '동' : '—', group: chosen, n: cnt }, ...recent].slice(0, 5)); setCnt(1);
    } catch { setSaved({ ok: false, t: t.fail }); } finally { setBusy(false); }
  };
  const opts = dongGroupOpts(p.groups);
  const cur = chosen ? G.find((r) => r.group === chosen) ?? null : null;
  const list = deaths.length || onEditDeath ? [...deaths].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.at ?? '') < (b.at ?? '') ? 1 : -1)) : recent.map((x, i) => ({ id: 'r' + i, date: today.slice(0, 5) + x.date.replace('/', '-'), dong: x.dong === '—' ? '' : x.dong.replace('동', ''), group: x.group, count: x.n, checked: false }));
  const rowOf = (x: (typeof list)[number]) => ed && ed.id === x.id ? (
              <div key={x.id} style={{ padding: '10px 0', borderBottom: '1px solid #EFEBE3', display: 'grid', gap: 8 }}>
                <label style={{ fontSize: 14 }}>{t.when}<br /><input type="date" value={ed.date} max={p.today} onChange={(e) => setEd({ ...ed, date: e.target.value })} style={{ fontSize: 16, minHeight: 44, width: '100%' }} /></label>
                <label style={{ fontSize: 14 }}>{t.dongGroup}<br /><select value={ed.dg} onChange={(e) => setEd({ ...ed, dg: e.target.value })} style={{ fontSize: 16, minHeight: 44, width: '100%' }}>{opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></label>
                <label style={{ fontSize: 14 }}>{t.count}<br /><input type="number" inputMode="numeric" min={1} max={300} value={ed.count} onChange={(e) => setEd({ ...ed, count: e.target.value })} style={{ fontSize: 16, minHeight: 44, width: '100%' }} /></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button className="pill" style={{ minHeight: 44 }} onClick={() => setEd(null)}>{t.cancel}</button>
                  <button className="pill on" style={{ minHeight: 44 }} disabled={busy || !(Number(ed.count) >= 1 && Number(ed.count) <= 300) || !ed.date} onClick={saveEdit}>{t.keep}</button>
                </div>
              </div>
            ) : (
              <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, padding: '6px 0', borderBottom: '1px solid #EFEBE3' }}>
                <span style={{ flex: 1 }}>{md(x.date)} · {x.dong ? x.dong + '동 ' : ''}({x.group})</span><b>{x.count} {t.unit}</b>
                {onEditDeath && <button className="pill" style={{ minHeight: 40, fontSize: 14 }} onClick={() => { setEd({ id: x.id, date: x.date, dg: (x.dong ?? '') + '|' + x.group, count: String(x.count) }); setSaved(null); }}>{t.edit}</button>}
              </div>
            );
  const recentList = list.filter((x) => x.date >= addIso(p.today, -6));
  const stList = list.filter((x) => x.date >= addIso(p.today, -(range - 1)));
  const stDays = [...new Set(stList.map((x) => x.date))];
  const saveEdit = async () => {
    if (!ed || !onEditDeath || busy) return;
    const [d, g] = ed.dg.split('|');
    setBusy(true);
    try { await onEditDeath(ed.id, { date: ed.date, dong: d, group: g, count: Math.round(Number(ed.count)) }); setEd(null); setSaved({ ok: true, t: t.edited }); }
    catch { setSaved({ ok: false, t: t.fail }); } finally { setBusy(false); }
  };
  const tabs: [typeof tab, string][] = [['home', t.tabHome], ['status', t.tabStatus], ['death', t.tabDeath], ['ship', t.tabShip], ['task', t.tabTask]];
  const shipping = G.filter((r) => r.sold > 0);

  // 좌우로 밀면 옆 탭으로 (가로로 스크롤되는 표·입력칸 위에서는 무시)
  const touch = useRef<{ x: number; y: number; ok: boolean } | null>(null);
  const canSwipe = (el: EventTarget | null) => {
    for (let n = el as HTMLElement | null; n && n !== document.body; n = n.parentElement) {
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(n.tagName)) return false;
      const ox = getComputedStyle(n).overflowX;
      if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth + 2) return false;
    }
    return true;
  };
  const onTouchStart = (e: React.TouchEvent) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY, ok: e.touches.length === 1 && canSwipe(e.target) }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s0 = touch.current; touch.current = null; if (!s0?.ok) return;
    const t = e.changedTouches[0], dx = t.clientX - s0.x, dy = t.clientY - s0.y;
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
    const i = tabs.findIndex(([k]) => k === tab), j = dx < 0 ? i + 1 : i - 1;
    if (j >= 0 && j < tabs.length) { setTab(tabs[j][0]); setEd(null); window.scrollTo(0, 0); }
  };
  return (
    <div className="v5 share" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ maxWidth: 480, margin: '0 auto', padding: '16px 14px 40px', boxSizing: 'border-box', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div><div style={{ fontSize: 21, fontWeight: 700 }}>{p.farm}{t.farmSfx}</div><div className="muted" style={{ fontSize: 12 }}>{t.asOf(short(p.asOf))}</div></div>
        <div className="segs" role="group" aria-label="언어"><button className={lang === 'ko' ? 'seg on' : 'seg'} onClick={() => setLang('ko')}>한국어</button><button className={lang === 'ne' ? 'seg on' : 'seg'} onClick={() => setLang('ne')}>नेपाली</button></div>
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 8, overflowX: 'auto', borderBottom: '1px solid #E2DDD2' }} role="tablist">
        {tabs.map(([k, nm]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'tab on' : 'tab'} onClick={() => setTab(k)}>{nm}</button>)}
      </div>

      {tab === 'home' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 14 }}>
            <div className="card"><div className="muted" style={{ fontSize: 12 }}>{t.stock}</div><div style={{ fontSize: 22, fontWeight: 700 }}>{G.reduce((a, r) => a + r.stock, 0).toLocaleString()}</div></div>
            <div className="card"><div className="muted" style={{ fontSize: 12 }}>{t.groups}</div><div style={{ fontSize: 22, fontWeight: 700 }}>{G.length}</div></div>
            <div className="card"><div className="muted" style={{ fontSize: 12 }}>{t.deathAll}</div><div style={{ fontSize: 22, fontWeight: 700 }}>{G.reduce((a, r) => a + r.death, 0)}</div></div>
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{t.issue}</div>
            {issues.length === 0 && <div className="muted" style={{ fontSize: 14 }}>{t.noIssue}</div>}
            {issues.map((x, i) => <div key={i} style={{ fontSize: 15, lineHeight: 1.7, padding: '4px 0', borderBottom: '1px solid #EFEBE3' }}>{x}</div>)}
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700 }}>{t.matrix}</div>
            <div style={{ overflowX: 'auto', marginTop: 10 }}><div style={{ minWidth: 60 + wcols.length * (CW + GP) + bands.length * BG }}>
              <div style={{ display: 'flex', gap: 3 }}><div style={{ width: 52, flex: 'none' }} />{bands.map((b, i) => <div key={i} style={{ width: b.w, marginLeft: b.ml, background: b.bg, flex: 'none', borderRadius: '6px 6px 0 0', padding: '3px 4px', boxSizing: 'border-box', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden' }}><b>{b.label}</b></div>)}</div>
              <div style={{ display: 'flex', gap: 3, padding: '3px 0 5px', borderBottom: '1px solid #D9D3C6' }}><div style={{ width: 52, flex: 'none' }} />{wcols.map((h) => <div key={h.n} style={{ width: 28, flex: 'none', marginLeft: h.ml, textAlign: 'center', fontSize: 11 }} className="muted">{h.n}</div>)}</div>
              {G.map((r) => (
                <div key={r.group} style={{ display: 'flex', gap: 3, alignItems: 'center', padding: '3px 0' }}>
                  <div style={{ width: 52, flex: 'none', lineHeight: 1.1 }}><b style={{ fontSize: 13 }}>{r.group}</b><div className="muted" style={{ fontSize: 11 }}>{dongLbl(r.dong)}</div></div>
                  {wcols.map((c) => { const v = c.n <= r.week ? (r.weekly[c.n - 1] ?? 0) : null; const h = heat(v); const st = addIso(r.date, 7 * (c.n - 1)); return (
                    <div key={c.n} className="hc" title={(lang === 'ko' ? c.n + '주차 ' : t.wk + ' ' + c.n + ' ') + md(st) + '~' + md(addIso(st, 6)) + (v === null ? '' : ' · ' + v + ' ' + t.unit)} style={{ width: 28, height: 30, flex: 'none', fontSize: 13, background: h.bg, color: h.fg, marginLeft: c.ml, border: c.n === r.week ? '2px solid #1F4E3D' : v === null ? '1px dashed #D9D3C6' : '1px solid transparent' }}>{v === null ? '' : v === 0 ? '·' : v}</div>
                  ); })}
                </div>
              ))}
            </div></div>
          </div>
        </>
      )}
      {tab === 'status' && G.map((g) => (
        <div key={g.group} className="card" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><div style={{ fontSize: 18, fontWeight: 700 }}>{g.group}{g.dong !== '—' ? ' · ' + g.dong : ''}</div><span className={g.bad ? 'chip bad' : 'chip ok'}>{t.surv} {g.surv}%</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, marginTop: 10, fontSize: 13 }}>
            <div><div className="muted">{t.inn}</div><b style={{ fontSize: 16 }}>{g.net.toLocaleString()}</b></div>
            <div><div className="muted">{t.death}</div><b style={{ fontSize: 16 }}>{g.death}</b></div>
            <div><div className="muted">{t.sold}</div><b style={{ fontSize: 16 }}>{g.sold.toLocaleString()}</b></div>
            <div><div className="muted">{t.stock}</div><b style={{ fontSize: 16 }}>{g.stock.toLocaleString()}</b></div>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>{t.meta(md(g.date), g.age, g.week)}</div>
        </div>
      ))}
      {tab === 'death' && (
        <>
          <div className="segs" role="group" style={{ marginTop: 12, display: 'flex' }}>
            <button className={dTab === 'in' ? 'seg on' : 'seg'} style={{ flex: 1, minHeight: 44 }} onClick={() => setDTab('in')}>{t.dIn}</button>
            <button className={dTab === 'st' ? 'seg on' : 'seg'} style={{ flex: 1, minHeight: 44 }} onClick={() => { setDTab('st'); setEd(null); }}>{t.dSt}</button>
          </div>
          {dTab === 'st' && (
            <>
              <div className="card" style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', gap: 6 }}>{[7, 14, 30].map((n) => <button key={n} className={range === n ? 'pill on' : 'pill'} style={{ flex: 1, minHeight: 44 }} onClick={() => setRange(n)}>{t.days(n)}</button>)}</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 10 }}>{t.periodTot(stList.reduce((a, x) => a + x.count, 0), range)}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>{[...new Set(stList.map((x) => x.group))].map((g) => <span key={g} className="chip">{g} · {stList.filter((x) => x.group === g).reduce((a, x) => a + x.count, 0)}</span>)}</div>
              </div>
              {stDays.length === 0 && <div className="card" style={{ marginTop: 12 }}><div className="muted">{t.none}</div></div>}
              {stDays.map((d) => { const L = stList.filter((x) => x.date === d); return (
                <div key={d} className="card" style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 4 }}><span>{md(d)}{lang === 'ko' ? ' (' + '일월화수목금토'[new Date(d + 'T00:00:00Z').getUTCDay()] + ')' : ''}</span><span>{t.dayTot(L.reduce((a, x) => a + x.count, 0))}</span></div>
                  {L.map((x) => rowOf(x))}
                </div>
              ); })}
            </>
          )}
          {dTab === 'in' && (
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700 }}>{t.photo}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input ref={pref} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => { if (e.target.files?.length) addPhotos(e.target.files); e.target.value = ''; }} />
              {photos.map((s, i) => <div key={i} style={{ position: 'relative' }}><img src={s} alt={t.photo + ' ' + (i + 1)} style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 10, display: 'block' }} /><button aria-label="✕" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, width: 28, height: 28, borderRadius: 14, border: 0, background: 'rgba(0,0,0,.55)', color: '#fff', cursor: 'pointer' }}>✕</button></div>)}
              {photos.length < 3 && <button onClick={() => pref.current?.click()} style={{ font: 'inherit', width: 84, height: 84, borderRadius: 10, border: '2px dashed #B9B3A6', background: '#fff', color: '#3E4B45', cursor: 'pointer', fontSize: 13 }}>+ {t.addPhoto}</button>}
            </div>
            {!noDong && (
              <>
                <div style={{ fontWeight: 700, marginTop: 16 }}>{t.dong}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 8 }}>{dongs.map((d) => <button key={d} className={dong === d ? 'pill on' : 'pill'} style={{ fontSize: 16, minHeight: 48, borderRadius: 12 }} onClick={() => { setDong(d); setGrp(null); setSaved(null); }}>{d}동</button>)}{plain.length > 0 && <button className={dong === '' ? 'pill on' : 'pill'} style={{ fontSize: 16, minHeight: 48, borderRadius: 12 }} onClick={() => { setDong(''); setGrp(null); setSaved(null); }}>{plain.map((r) => r.group).join('·')}</button>}</div>
              </>
            )}
            {(noDong || (dong !== null && cover.length > 1)) && (
              <>
                <div style={{ fontWeight: 700, marginTop: 16 }}>{t.group}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>{cover.map((r) => <button key={r.group} className={grp === r.group ? 'pill on' : 'pill'} style={{ fontSize: 16, minHeight: 48, borderRadius: 12 }} onClick={() => { setGrp(r.group); setSaved(null); }}>{r.group}</button>)}</div>
              </>
            )}
            {!noDong && cover.length === 1 && <div style={{ marginTop: 8 }}><span className="chip ok">{t.auto}: {cover[0].group}{dong ? ` (${dong}동)` : ''}</span></div>}
            {cur && (() => { const c = Math.min(cnt, cur.claimLeft ?? 0), d2 = cur.death + cnt - c, s2 = survOf(cur.net, d2); return (
              <div style={{ marginTop: 12, padding: '10px 12px', background: '#F4F2EC', borderRadius: 10, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 6, fontSize: 13 }}>
                <div><div className="muted">{t.stock}</div><b style={{ fontSize: 18 }}>{cur.stock.toLocaleString()}</b><div className="muted">→ {(cur.stock - cnt).toLocaleString()}</div></div>
                <div><div className="muted">{t.surv}</div><b style={{ fontSize: 18, color: cur.bad ? '#9A3216' : undefined }}>{cur.surv}%</b><div className="muted">→ {s2}%</div></div>
                <div><div className="muted">{t.death}</div><b style={{ fontSize: 18 }}>{cur.death}</b><div className="muted">→ {d2}</div></div>
              </div>
            ); })()}
            <div style={{ fontWeight: 700, marginTop: 16 }}>{t.when}</div>
            <input type="date" value={day} max={p.today} onChange={(e) => { setDay(e.target.value || p.today); setSaved(null); }} style={{ fontSize: 16, minHeight: 44, marginTop: 8 }} />
            <div style={{ fontWeight: 700, marginTop: 16 }}>{t.count}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
              <button className="step" onClick={() => { setCnt(Math.max(1, cnt - 1)); setSaved(null); }} aria-label="−1">−</button>
              <div style={{ fontSize: 34, fontWeight: 700, minWidth: 56, textAlign: 'center' }}>{cnt}</div>
              <button className="step" onClick={() => { setCnt(cnt + 1); setSaved(null); }} aria-label="+1">+</button>
              <span className="muted">{t.unit}</span>
            </div>
            <button className="sbtn" style={{ marginTop: 18 }} disabled={!chosen || busy} onClick={save}>{t.save}</button>
            {saved && <div style={{ marginTop: 10 }}><span className={saved.ok ? 'chip ok' : 'chip bad'} style={{ fontSize: 14 }}>{saved.t}</span></div>}
          </div>
          )}
          {dTab === 'in' && (
            <div className="card" style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{t.recentDays}</div>
              {recentList.length === 0 && <div className="muted" style={{ fontSize: 14 }}>{t.none}</div>}
              {recentList.map((x) => rowOf(x))}
            </div>
          )}
        </>
      )}
      {tab === 'ship' && (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700 }}>{t.avgTitle}</div>
            <div className="muted" style={{ fontSize: 12 }}>{t.avgSub(short(p.shipFrom), short(p.asOf), S.length)}</div>
            {S.length === 0 ? <div className="muted" style={{ marginTop: 8 }}>{t.noShip}</div> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 10 }}>
                {avg.map(([l, v, x]) => <div key={l} style={{ background: '#F7F5F0', borderRadius: 10, padding: '8px 10px' }}><div className="muted" style={{ fontSize: 12 }}>{l}</div><div style={{ fontSize: 18, fontWeight: 700 }}>{v}</div><div className="muted" style={{ fontSize: 11 }}>{x}</div></div>)}
              </div>
            )}
          </div>
          {S.length > 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{t.recentShip}</div>
              <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 360 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '46px 40px 58px 50px 30px 30px 30px 34px', gap: 4, fontSize: 11, paddingBottom: 4, borderBottom: '1px solid #D9D3C6' }} className="muted"><div>{t.date}</div><div className="r">{t.heads}</div><div className="r">{t.avgw}</div><div className="r">{t.yield}</div><div className="r">1+</div><div className="r">1</div><div className="r">2</div><div className="r">{t.out}</div></div>
                {S.slice(0, 8).map((x, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '46px 40px 58px 50px 30px 30px 30px 34px', gap: 4, fontSize: 14, padding: '7px 0', borderBottom: '1px solid #EFEBE3', fontVariantNumeric: 'tabular-nums' }}><div>{md(x.d)}</div><div className="r b">{x.n}</div><div className="r">{x.w === null ? '—' : x.w + 'kg'}</div><div className="r">{x.y === null ? '—' : x.y + '%'}</div><div className="r">{x.a}</div><div className="r">{x.b}</div><div className="r">{x.c}</div><div className="r">{x.o}</div></div>
                ))}
              </div></div>
            </div>
          )}
          {shipping.map((g) => <div key={g.group} className="card" style={{ marginTop: 12, fontSize: 15 }}>{t.shipTotal(g.group, g.sold, g.stock)}</div>)}
        </>
      )}
      {tab === 'task' && (
        <>
          {tasks.length === 0 && <div className="card" style={{ marginTop: 12 }}>{t.noTask}</div>}
          {tasks.map((k, i) => (
            <div key={i} className="card" style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <div><div style={{ fontWeight: 700, fontSize: 16 }}>{k.fmd ? t.jobFmd : t.jobDew}</div><div className="muted" style={{ fontSize: 13 }}>{k.group}{k.dong !== '—' ? ' · ' + k.dong : ''}</div></div>
              <span className={k.d <= weekEnd ? 'chip warn' : 'chip ok'} style={{ fontSize: 14 }}>{k.d.replace('-', '/')}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
