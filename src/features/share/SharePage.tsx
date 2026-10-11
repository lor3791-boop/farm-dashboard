// 농장 공유 화면 — 사장님·직원이 함께 보는 한 농장 화면. 한국어/네팔어. 금액·지급율·정산·다른 농장 정보 없음 (목업 v5 Share)
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useHerd } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { buildTasks, dongsOf, heat, REF, TODAY } from '@/lib/calc/herd';
import { addIso, md, r1 } from '@/lib/calc/dates';
import { SHIP } from '@/data/snapshot';
import { todayKST } from '@/lib/util';

const KO = { sub: (d: string) => d + ' 기준 · 지역부장과 같은 화면', tabHome: '홈', tabStatus: '돈군', tabDeath: '폐사 등록', tabShip: '출하', tabTask: '작업', stock: '현재 두수', groups: '돈군', deathAll: '누적 폐사', matrix: '돈군별 주차 폐사', month: '개월차', wk: '주', matrixNote: '주차 = 전입일부터 7일씩 · 색이 진할수록 폐사가 많음 · 굵은 테두리 = 이번 주 · 점선 = 아직 안 온 주', issue: '이번 주 확인할 것', inn: '전입', death: '폐사', sold: '출하', surv: '육성률', photo: '폐사 사진', addPhoto: '사진', dong: '어느 동인가요?', group: '어느 그룹인가요?', auto: '자동 연결', count: '몇 두인가요?', unit: '두', save: '등록', saved: '등록했습니다', recent: '최근 등록', example: '이 기기에서 등록한 기록', heads: '두수', avgw: '평균체중', out: '등외', avgTitle: '평균 출하 성적', aN: '출하두수', aW: '평균체중', aYield: '지육율', aGrade: '등급율 (1+·1)', g1p: '1+ 등급', aOut: '등외', times: '회', recentShip: '최근 출하 (날짜별)', date: '날짜', yield: '지육율', jobDew: '구충제 · 사료 2호 변경', jobFmd: '구제역 백신', foot: '금액·정산·다른 농장 정보는 보이지 않습니다 · 사장님·직원 모두 폐사 등록 가능', farmSfx: ' 농장', noIssue: '특별히 확인할 것이 없습니다', iDeath: (g: string, d: string, w: number, n: number) => `${g} (${d}): ${w}주차에 ${n}두 폐사 → 원인 확인`, iJob: (g: string, d: string, dt: string, j: string) => `${g} (${d}): ${dt} ${j}`, meta: (d: string, a: number, w: number) => `${d} 전입 · ${a}일령 · ${w}주차`, shipTotal: (g: string, s: number, k: number) => `${g}: 지금까지 ${s}두 출하 · ${k}두 남음`, avgSub: (f: string, t: string, n: number) => `${f}~${t} · ${n}회 출하 · 가중평균`, noShip: '아직 출하가 없습니다', noTask: '예정된 작업이 없습니다' };
const NE: typeof KO = { sub: (d) => d + ' सम्मको जानकारी · म्यानेजरसँग एउटै स्क्रिन', tabHome: 'होम', tabStatus: 'बंगुर समूह', tabDeath: 'मरेको दर्ता', tabShip: 'बिक्री', tabTask: 'काम', stock: 'अहिले भएका बंगुर', groups: 'समूह', deathAll: 'जम्मा मरेका', matrix: 'हप्ता अनुसार मरेका बंगुर', month: 'महिना', wk: 'हप्ता', matrixNote: 'हप्ता = बंगुर ल्याएको दिनदेखि 7 दिन · रंग गाढा = धेरै मरेका · बाक्लो किनारा = यो हप्ता · धर्का = अझै नआएको हप्ता', issue: 'यो हप्ता हेर्नुपर्ने कुरा', inn: 'ल्याएको', death: 'मरेको', sold: 'बिक्री', surv: 'बाँचेको', photo: 'मरेको बंगुरको फोटो', addPhoto: 'फोटो', dong: 'कुन खोर (동)?', group: 'कुन समूह?', auto: 'समूह आफैं मिल्यो', count: 'कति वटा?', unit: 'वटा', save: 'दर्ता गर्नुहोस्', saved: 'दर्ता भयो', recent: 'भर्खरको दर्ता', example: 'यो फोनबाट दर्ता गरिएको', heads: 'संख्या', avgw: 'औसत तौल', out: 'ग्रेड बाहिर', avgTitle: 'बिक्रीको औसत नतिजा', aN: 'बिक्री संख्या', aW: 'औसत तौल', aYield: 'मासु प्रतिशत', aGrade: 'ग्रेड 1+ र 1', g1p: 'ग्रेड 1+', aOut: 'ग्रेड बाहिर', times: 'पटक', recentShip: 'हालको बिक्री (मिति अनुसार)', date: 'मिति', yield: 'मासु %', jobDew: 'जुकाको औषधि · दाना 2 नम्बर', jobFmd: 'खोरेत खोप', foot: 'पैसा र अरू फार्मको जानकारी यहाँ देखिँदैन · मालिक र कामदार दुवैले दर्ता गर्न सक्छन्', farmSfx: ' फार्म', noIssue: 'विशेष हेर्नुपर्ने कुरा छैन', iDeath: (g, d, w, n) => `${g} (${d}): हप्ता ${w} मा ${n} वटा मरे → कारण हेर्नुहोस्`, iJob: (g, d, dt, j) => `${g} (${d}): ${dt} मा ${j}`, meta: (d, a, w) => `${d} मा ल्याएको · ${a} दिनको · हप्ता ${w}`, shipTotal: (g, s, k) => `${g}: अहिलेसम्म ${s} वटा बिक्री · ${k} वटा बाँकी`, avgSub: (f, t, n) => `${f}~${t} · ${n} पटक बिक्री`, noShip: 'अहिलेसम्म बिक्री छैन', noTask: 'कुनै काम छैन' };

export function SharePage() {
  const [sp] = useSearchParams();
  const { all, farms } = useHerd();
  const { repo, email } = useAuth();
  const farm = sp.get('farm') && farms.includes(sp.get('farm')!) ? sp.get('farm')! : '민서';
  const [lang, setLang] = useState<'ko' | 'ne'>('ko');
  const [tab, setTab] = useState<'home' | 'status' | 'death' | 'ship' | 'task'>('home');
  const [dong, setDong] = useState<string | null>(null);
  const [grp, setGrp] = useState<string | null>(null);
  const [cnt, setCnt] = useState(1);
  const [saved, setSaved] = useState('');
  const [recent, setRecent] = useState<{ date: string; dong: string; group: string; n: number }[]>([]);
  const t = lang === 'ko' ? KO : NE;
  const G = useMemo(() => all.filter((r) => r.farm === farm), [all, farm]);
  if (!G.length) return null;
  const noDong = G.every((r) => r.dong === '—');
  const dongs = [...new Set(G.flatMap((r) => dongsOf(r.dong)))].sort();
  const cover = noDong ? G : G.filter((r) => dong !== null && dongsOf(r.dong).includes(dong));
  const chosen = !noDong && cover.length === 1 ? cover[0].group : grp;

  const maxW = Math.max(...G.map((r) => r.week)), CW = 28, GP = 3, BG = 8;
  const bands: { label: string; w: number; ml: number; bg: string }[] = [], wcols: { n: number; ml: number }[] = [];
  for (let b = 0; b < Math.ceil(maxW / 4); b++) { const ws: number[] = []; for (let n = b * 4 + 1; n <= Math.min(maxW, b * 4 + 4); n++) ws.push(n);
    bands.push({ label: lang === 'ko' ? b + 1 + t.month : t.month + ' ' + (b + 1), w: ws.length * CW + (ws.length - 1) * GP, ml: b ? BG : 0, bg: b % 2 ? '#F1EEE6' : '#E6EFE9' });
    ws.forEach((n, i) => wcols.push({ n, ml: b && i === 0 ? BG : 0 })); }
  const dongLbl = (d: string) => (d === '—' ? '' : d);

  // 이번 주 확인할 것: 최근 4주 중 한 주 5두 이상 폐사 + 이번 주 작업
  const tasks = buildTasks(G).filter((k) => k.d >= addIso(TODAY, -7).slice(5));
  const issues: string[] = [];
  G.forEach((r) => { const from = Math.max(0, r.week - 5); r.weekly.slice(from).forEach((v, i) => { if (v >= 5) issues.push(t.iDeath(r.group, dongLbl(r.dong) || '—', from + i + 1, v)); }); });
  tasks.filter((k) => k.d <= addIso(TODAY, 6).slice(5)).forEach((k) => { const r = G.find((x) => x.who === k.who)!; issues.push(t.iJob(r.group, dongLbl(r.dong) || '—', k.d.replace('-', '/'), k.job.startsWith('구제역') ? t.jobFmd : t.jobDew)); });

  const ships = SHIP.filter((x) => x[1] === farm && x[0] >= '2026-08-01').sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const n = ships.reduce((a, x) => a + x[3], 0), live = ships.reduce((a, x) => a + x[4], 0), carc = ships.reduce((a, x) => a + x[5], 0);
  const g1p = ships.reduce((a, x) => a + x[7], 0), g1 = ships.reduce((a, x) => a + x[8], 0), out = ships.reduce((a, x) => a + x[10], 0);
  const avg: [string, string, string][] = [[t.aN, n.toLocaleString(), ships.length + ' ' + t.times], [t.aW, n ? r1(live / n) + 'kg' : '—', ''], [t.aYield, live ? r1((carc / live) * 100) + '%' : '—', ''], [t.aGrade, n ? r1(((g1p + g1) / n) * 100) + '%' : '—', ''], [t.g1p, n ? r1((g1p / n) * 100) + '%' : '—', ''], [t.aOut, String(out), n ? r1((out / n) * 100) + '%' : '']];
  const shipping = G.filter((r) => r.sold > 0);

  const save = async () => {
    if (!chosen) return;
    const d = dong ?? '';
    await repo?.addDeath({ date: todayKST(), farm, dong: d, group: chosen, count: cnt }, email || 'share');
    setSaved(t.saved + ' · ' + (d ? d + '동 ' : '') + '(' + chosen + ') · ' + cnt + ' ' + t.unit);
    setRecent([{ date: md(todayKST()), dong: d ? d + '동' : '—', group: chosen, n: cnt }, ...recent].slice(0, 5)); setCnt(1);
  };
  const tabs: [typeof tab, string][] = [['home', t.tabHome], ['status', t.tabStatus], ['death', t.tabDeath], ['ship', t.tabShip], ['task', t.tabTask]];

  return (
    <div className="v5 share" style={{ maxWidth: 480, margin: '0 auto', padding: '16px 14px 40px', boxSizing: 'border-box', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div><div style={{ fontSize: 21, fontWeight: 700 }}>{farm}{t.farmSfx}</div><div className="muted" style={{ fontSize: 12 }}>{t.sub(REF.slice(5).split('-').map(Number).join('/'))}</div></div>
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
                <div key={r.who} style={{ display: 'flex', gap: 3, alignItems: 'center', padding: '3px 0' }}>
                  <div style={{ width: 52, flex: 'none', lineHeight: 1.1 }}><b style={{ fontSize: 13 }}>{r.group}</b><div className="muted" style={{ fontSize: 11 }}>{dongLbl(r.dong)}</div></div>
                  {wcols.map((c) => { const v = c.n <= r.week ? (r.weekly[c.n - 1] ?? 0) : null; const h = heat(v); const st = addIso(r.date, 7 * (c.n - 1)); return (
                    <div key={c.n} className="hc" title={(lang === 'ko' ? c.n + '주차 ' : t.wk + ' ' + c.n + ' ') + md(st) + '~' + md(addIso(st, 6)) + (v === null ? '' : ' · ' + v + ' ' + t.unit)} style={{ width: 28, height: 30, flex: 'none', fontSize: 13, background: v === null ? 'transparent' : h.bg, color: h.fg, marginLeft: c.ml, border: c.n === r.week ? '2px solid #1F4E3D' : v === null ? '1px dashed #D9D3C6' : '1px solid transparent' }}>{v === null ? '' : v === 0 ? '·' : v}</div>
                  ); })}
                </div>
              ))}
            </div></div>
            <div className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>{t.matrixNote}</div>
          </div>
        </>
      )}
      {tab === 'status' && G.map((g) => (
        <div key={g.who} className="card" style={{ marginTop: 12 }}>
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
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700 }}>{t.photo}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <div style={{ width: 84, height: 84, borderRadius: 10, background: '#DCD6C9' }} aria-hidden="true" />
              <button style={{ font: 'inherit', width: 84, height: 84, borderRadius: 10, border: '2px dashed #B9B3A6', background: '#fff', color: '#3E4B45', cursor: 'pointer', fontSize: 13 }}>+ {t.addPhoto}</button>
            </div>
            {!noDong && (
              <>
                <div style={{ fontWeight: 700, marginTop: 16 }}>{t.dong}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 8 }}>{dongs.map((d) => <button key={d} className={dong === d ? 'pill on' : 'pill'} style={{ fontSize: 16, minHeight: 48, borderRadius: 12 }} onClick={() => { setDong(d); setGrp(null); setSaved(''); }}>{d}동</button>)}</div>
              </>
            )}
            {(noDong || (dong && cover.length > 1)) && (
              <>
                <div style={{ fontWeight: 700, marginTop: 16 }}>{t.group}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>{cover.map((r) => <button key={r.group} className={grp === r.group ? 'pill on' : 'pill'} style={{ fontSize: 16, minHeight: 48, borderRadius: 12 }} onClick={() => { setGrp(r.group); setSaved(''); }}>{r.group}</button>)}</div>
              </>
            )}
            {!noDong && cover.length === 1 && <div style={{ marginTop: 8 }}><span className="chip ok">{t.auto}: {cover[0].group} ({dong}동)</span></div>}
            <div style={{ fontWeight: 700, marginTop: 16 }}>{t.count}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
              <button className="step" onClick={() => { setCnt(Math.max(1, cnt - 1)); setSaved(''); }} aria-label="−1">−</button>
              <div style={{ fontSize: 34, fontWeight: 700, minWidth: 56, textAlign: 'center' }}>{cnt}</div>
              <button className="step" onClick={() => { setCnt(cnt + 1); setSaved(''); }} aria-label="+1">+</button>
              <span className="muted">{t.unit}</span>
            </div>
            <button className="sbtn" style={{ marginTop: 18 }} disabled={!chosen} onClick={save}>{t.save}</button>
            {saved && <div style={{ marginTop: 10 }}><span className="chip ok" style={{ fontSize: 14 }}>{saved}</span></div>}
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{t.recent}</div>
            {recent.map((x, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, padding: '6px 0', borderBottom: '1px solid #EFEBE3' }}><span>{x.date} · {x.dong} ({x.group})</span><b>{x.n} {t.unit}</b></div>)}
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{t.example}</div>
          </div>
        </>
      )}
      {tab === 'ship' && (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700 }}>{t.avgTitle}</div>
            <div className="muted" style={{ fontSize: 12 }}>{t.avgSub('8/1', REF.slice(5).split('-').map(Number).join('/'), ships.length)}</div>
            {ships.length === 0 ? <div className="muted" style={{ marginTop: 8 }}>{t.noShip}</div> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 10 }}>
                {avg.map(([l, v, x]) => <div key={l} style={{ background: '#F7F5F0', borderRadius: 10, padding: '8px 10px' }}><div className="muted" style={{ fontSize: 12 }}>{l}</div><div style={{ fontSize: 18, fontWeight: 700 }}>{v}</div><div className="muted" style={{ fontSize: 11 }}>{x}</div></div>)}
              </div>
            )}
          </div>
          {ships.length > 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{t.recentShip}</div>
              <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 360 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '46px 40px 58px 50px 30px 30px 30px 34px', gap: 4, fontSize: 11, paddingBottom: 4, borderBottom: '1px solid #D9D3C6' }} className="muted"><div>{t.date}</div><div className="r">{t.heads}</div><div className="r">{t.avgw}</div><div className="r">{t.yield}</div><div className="r">1+</div><div className="r">1</div><div className="r">2</div><div className="r">{t.out}</div></div>
                {ships.slice(0, 8).map((x, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '46px 40px 58px 50px 30px 30px 30px 34px', gap: 4, fontSize: 14, padding: '7px 0', borderBottom: '1px solid #EFEBE3', fontVariantNumeric: 'tabular-nums' }}><div>{md(x[0])}</div><div className="r b">{x[3]}</div><div className="r">{x[3] ? r1(x[4] / x[3]) + 'kg' : '—'}</div><div className="r">{x[4] ? r1((x[5] / x[4]) * 100) + '%' : '—'}</div><div className="r">{x[7]}</div><div className="r">{x[8]}</div><div className="r">{x[9]}</div><div className="r">{x[10]}</div></div>
                ))}
              </div></div>
            </div>
          )}
          {shipping.map((g) => <div key={g.who} className="card" style={{ marginTop: 12, fontSize: 15 }}>{t.shipTotal(g.group, g.sold, g.stock)}</div>)}
        </>
      )}
      {tab === 'task' && (
        <>
          {tasks.length === 0 && <div className="card" style={{ marginTop: 12 }}>{t.noTask}</div>}
          {tasks.map((k) => { const r = G.find((x) => x.who === k.who)!; const soon = k.d <= addIso(TODAY, 6).slice(5); return (
            <div key={k.key} className="card" style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <div><div style={{ fontWeight: 700, fontSize: 16 }}>{k.job.startsWith('구제역') ? t.jobFmd : t.jobDew}</div><div className="muted" style={{ fontSize: 13 }}>{r.group}{r.dong !== '—' ? ' · ' + r.dong : ''}</div></div>
              <span className={soon ? 'chip warn' : 'chip ok'} style={{ fontSize: 14 }}>{k.d.replace('-', '/')}</span>
            </div>
          ); })}
        </>
      )}
      <div className="muted" style={{ fontSize: 11, marginTop: 20, textAlign: 'center' }}>{t.foot}</div>
      <div style={{ textAlign: 'center', marginTop: 8 }}><a href="#/" style={{ fontSize: 13 }}>← 지역부장 대시보드로</a></div>
    </div>
  );
}
