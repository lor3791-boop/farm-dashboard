// 입력 — 폐사 / 출하 / 전입·배치 / 사료·백신비 (목업 v5)
import { useRef, useState } from 'react';
import { useHerd } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { dongsOf } from '@/lib/calc/herd';
import { fmt, md } from '@/lib/calc/dates';
import { Tabs } from '@/components/v5';
import { todayKST } from '@/lib/util';
import { ShipManualList } from './ShipManual';
import { UnregisteredDeaths, DeathList } from './Deaths';
import { ShipUpload, ShipStatus } from './Ship';
import { survOf } from '@/share/applyDeaths';

// 파일 고르기 — 고른 파일 이름을 보여주고, 자동 인식은 해당 묶음에서 연결
function FilePick({ label, cls = 'btn', style, accept = '.xls,.xlsx' }: { label: string; cls?: string; style?: React.CSSProperties; accept?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', ...style }}>
      <input ref={ref} type="file" accept={accept} hidden onChange={(e) => setName(e.target.files?.[0]?.name ?? '')} />
      <button className={cls} onClick={() => ref.current?.click()}>{label}</button>
      {name && <span className="chip info" style={{ whiteSpace: 'normal' }}>{name}</span>}
    </span>
  );
}

export function InputPage() {
  const { all, farms, passFarm, s, set, saved: ui } = useHerd();
  const { repo, email } = useAuth();
  const [cnt, setCnt] = useState(1);
  const [date, setDate] = useState(todayKST());
  const [saved, setSaved] = useState('');
  const [savedOk, setSavedOk] = useState(true);
  if (!all.length) return null;

  const dRows = all.filter((r) => r.farm === s.dFarm);
  const hasDong = dRows.some((r) => r.dong !== '—');
  const dongs = [...new Set(dRows.flatMap((r) => dongsOf(r.dong)))].sort();
  const cover = hasDong ? dRows.filter((r) => s.dDong !== null && dongsOf(r.dong).includes(s.dDong)) : dRows;
  const auto = hasDong && cover.length === 1;
  const chosen = auto ? cover[0].group : s.dGroup;
  const save = async () => {
    if (!chosen) { setSavedOk(false); setSaved('그룹을 먼저 골라야 저장됩니다'); return; }
    const before = cur;
    await repo!.addDeath({ date, farm: s.dFarm, dong: s.dDong ?? '', group: chosen, count: cnt }, email, ui.shareLinks[s.dFarm] ?? '');
    setSavedOk(true); setSaved(`저장됨: ${s.dFarm} ${chosen} ${cnt}두 · ${md(date)}` + (before && before.claimLeft > 0 ? ` (크레임 ${Math.min(cnt, before.claimLeft)}두 먼저 차감)` : ''));
    setCnt(1);
  };
  const cur = chosen ? dRows.find((r) => r.group === chosen) ?? null : null;
  const after = cur ? (() => { const c = Math.min(cnt, cur.claimLeft); const d = cur.death + cnt - c; return { c, d, stock: cur.stock - cnt, surv: survOf(cur.net, d) }; })() : null;
  const entryRows = all.filter((r) => passFarm(r.farm)).map((r) => {
    const ds = dongsOf(r.dong);
    const mode = r.dong === '—' ? 'group' : ds.some((x) => all.filter((o) => o.farm === r.farm && dongsOf(o.dong).includes(x)).length > 1) ? 'pick' : 'auto';
    return { key: r.who, farm: r.farm, group: r.group, dong: r.dong === '—' ? '동 없이 관리' : r.dong, date: md(r.date), inn: fmt(r.inn), claim: fmt(r.claim), claimDead: r.claimDead, claimLeft: fmt(r.claimLeft), death: fmt(r.death), surv: r.surv, bad: r.bad, stock: fmt(r.stock), mode: mode === 'auto' ? '자동' : mode === 'pick' ? '그룹 선택' : '그룹만', cls: mode === 'auto' ? 'chip ok' : 'chip warn' };
  });
  const totStock = all.reduce((a, r) => a + r.stock, 0);
  const pill = (on: boolean) => (on ? 'pill on' : 'pill');
  const gcols = '0.9fr 0.6fr 1.1fr 0.6fr 0.75fr 0.9fr 0.65fr 0.7fr 0.75fr 0.9fr';

  return (
    <>
      <Tabs opts={[['death', '폐사'], ['ship', '출하'], ['entry', '전입·배치'], ['feed', '사료·백신비']]} value={s.inTab} onPick={(k) => set({ inTab: k })} />
      {s.inTab === 'death' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: 16 }}>
          <div className="card" style={{ maxWidth: 520 }}>
            <h2 className="h2">폐사 입력</h2>
            <div style={{ fontWeight: 700, margin: '14px 0 8px' }}>① 농장</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 6 }}>
              {farms.map((f) => <button key={f} className={pill(s.dFarm === f)} onClick={() => { set({ dFarm: f, dDong: null, dGroup: null }); setCnt(1); setSaved(''); }}>{f}</button>)}
            </div>
            {hasDong && (
              <>
                <div style={{ fontWeight: 700, margin: '16px 0 8px' }}>② 동</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{dongs.map((x) => <button key={x} className={pill(s.dDong === x)} onClick={() => { set({ dDong: x, dGroup: null }); setSaved(''); }}>{x}동</button>)}</div>
              </>
            )}
            {(!hasDong || (!!s.dDong && cover.length > 1)) && (
              <>
                <div style={{ fontWeight: 700, margin: '16px 0 8px' }}>{hasDong ? '③ 이 동에 그룹이 여럿 — 어느 그룹인가요?' : '② 그룹 (명임은 동 없이 관리)'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{cover.map((r) => <button key={r.group} className={pill(s.dGroup === r.group)} onClick={() => { set({ dGroup: r.group }); setSaved(''); }}>{r.group} · 재고 {fmt(r.stock)} · {r.surv}%</button>)}</div>
              </>
            )}
            {auto && <div style={{ marginTop: 12 }}><span className="chip ok">자동 연결: {s.dFarm} {cover[0].group}</span></div>}
            {cur && after && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: '#F4F2EC', borderRadius: 8, fontSize: 14, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 6 }}>
                <div><div className="muted" style={{ fontSize: 12 }}>재고</div><b style={{ fontSize: 17 }}>{fmt(cur.stock)}</b><div className="muted" style={{ fontSize: 12 }}>→ {fmt(after.stock)}</div></div>
                <div><div className="muted" style={{ fontSize: 12 }}>육성률</div><b style={{ fontSize: 17, color: cur.bad ? '#9A3216' : undefined }}>{cur.surv}%</b><div className="muted" style={{ fontSize: 12 }}>→ {after.surv}%</div></div>
                <div><div className="muted" style={{ fontSize: 12 }}>폐사</div><b style={{ fontSize: 17 }}>{fmt(cur.death)}</b><div className="muted" style={{ fontSize: 12 }}>→ {fmt(after.d)}</div></div>
                <div><div className="muted" style={{ fontSize: 12 }}>크레임 남음</div><b style={{ fontSize: 17 }}>{fmt(cur.claimLeft)}</b><div className="muted" style={{ fontSize: 12 }}>→ {fmt(cur.claimLeft - after.c)}</div></div>
              </div>
            )}
            <div style={{ fontWeight: 700, margin: '16px 0 8px' }}>④ 두수 · 날짜</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button className="pill" onClick={() => { setCnt(Math.max(1, cnt - 1)); setSaved(''); }} aria-label="두수 줄이기">−</button>
              <span style={{ fontSize: 24, fontWeight: 700, minWidth: 40, textAlign: 'center' }}>{cnt}</span>
              <button className="pill" onClick={() => { setCnt(cnt + 1); setSaved(''); }} aria-label="두수 늘리기">+</button>
              <label style={{ fontSize: 14, marginLeft: 8 }}>날짜 <input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            </div>
            <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn pri" onClick={save}>저장</button>
              <button className="btn" onClick={() => { setSaved('한 사진에 여러 동: 이 동을 저장한 뒤 동을 바꿔 한 번 더 저장하세요'); setSavedOk(true); }}>+ 동 추가 (한 사진에 여러 동)</button>
            </div>
            {saved && <div style={{ marginTop: 12 }}><span className={savedOk ? 'chip ok' : 'chip bad'} style={{ whiteSpace: 'normal' }}>{saved}</span></div>}
          </div>
          <UnregisteredDeaths />
        </div>
      )}
      {s.inTab === 'death' && <DeathList />}
      {s.inTab === 'ship' && (
        <>
          <ShipUpload />
          <ShipStatus />
          <ShipManualList />
        </>
      )}
      {s.inTab === 'entry' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 14 }}>
            <div className="card"><div style={{ fontWeight: 700 }}>피그온 전입현황</div><div style={{ marginTop: 10 }}><span className="chip ok">10/8 업로드 · 로트 반영 완료</span></div><FilePick label="새 파일 올리기" style={{ marginTop: 12 }} /></div>
            <div className="card"><div style={{ fontWeight: 700 }}>피그온 돈수불</div><div style={{ marginTop: 10 }}><span className="chip ok">재고 그룹 {all.length}개 · {fmt(totStock)}두</span></div><FilePick label="새 파일 올리기" style={{ marginTop: 12 }} /></div>
            <div className="card"><div style={{ fontWeight: 700 }}>직접 입력</div><button className="btn pri" style={{ marginTop: 22 }}>+ 그룹 직접 등록</button></div>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h2 className="h2" style={{ marginBottom: 10 }}>동 배치표</h2>
            <div className="gt">
              <div className="gr gh" style={{ gridTemplateColumns: gcols, minWidth: 900 }}><div>농장</div><div>그룹</div><div>동</div><div>전입일</div><div className="r">전입(실두수)</div><div className="r">크레임 (폐사/남음)</div><div className="r">폐사</div><div className="r">육성률</div><div className="r">재고</div><div>폐사 입력</div></div>
              {entryRows.map((g) => <div key={g.key} className="gr" style={{ gridTemplateColumns: gcols, minWidth: 900 }}><div>{g.farm}</div><div>{g.group}</div><div>{g.dong}</div><div>{g.date}</div><div className="r">{g.inn}</div><div className="r">{g.claim}<div className="sub" style={{ fontSize: 12 }}>{g.claimDead}/{g.claimLeft}</div></div><div className="r">{g.death}</div><div className="r" style={{ color: g.bad ? '#9A3216' : undefined }}>{g.surv}%</div><div className="r b">{g.stock}</div><div><span className={g.cls}>{g.mode}</span></div></div>)}
            </div>
          </div>
        </>
      )}
      {s.inTab === 'feed' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))', gap: 16 }}>
          <div className="card">
            <h2 className="h2" style={{ marginBottom: 8 }}>피그온 그룹 사료 사용</h2>
            <div><span className="chip ok">2026-01 ~ 2026-09 반영 · 1,784행</span></div>
            <div className="muted" style={{ fontSize: 13, margin: '10px 0' }}>민서 26-3</div>
            <div className="tblbox"><table>
              <thead><tr><th>월</th><th>단계</th><th className="r">kg</th></tr></thead>
              <tbody>
                {([['4월', '트랜스', '3,162.000'], ['4월', '젖돈(1호)', '1,815.565'], ['5월', '트랜스', '9,862.712'], ['5월', '젖돈(1호)', '4,299.443'], ['5월', '육성돈(2호)', '1,938.665'], ['6월', '젖돈(1호)', '7,957.584'], ['6월', '육성돈(2호)', '10,251.708'], ['7월', '육성돈(2호)', '23,621.953'], ['8월', '육성돈(2호)', '16,158.278'], ['9월', '육성돈(2호)', '1,499.652']]).map(([m, st, kg], i) => <tr key={i}><td>{m}</td><td>{st}</td><td className="r">{kg}</td></tr>)}
              </tbody>
            </table></div>
            <label style={{ display: 'block', fontSize: 14, marginTop: 12 }}>정산월 중간투입량 (kg)<br /><input type="number" placeholder="정산할 때만 입력" style={{ width: 200 }} /></label>
          </div>
          <div className="card">
            <h2 className="h2" style={{ marginBottom: 8 }}>구제역 백신비</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }}>
              <label style={{ fontSize: 14 }}>농장<br /><select><option>민서</option><option>산성농원</option></select></label>
              <label style={{ fontSize: 14 }}>접종일<br /><input type="date" defaultValue={todayKST()} /></label>
              <label style={{ fontSize: 14 }}>금액(원)<br /><input type="number" placeholder="[금액]" style={{ width: 140 }} /></label>
            </div>
            <div style={{ fontSize: 14, marginTop: 12 }}>대상 그룹: <label><input type="checkbox" defaultChecked /> 26-8</label> <label><input type="checkbox" /> 26-6</label></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}><button className="btn pri">저장</button><a href="https://drive.google.com" target="_blank" rel="noreferrer" style={{ alignSelf: 'center', fontSize: 14 }}>드라이브 정산증빙 폴더 열기</a></div>
          </div>
        </div>
      )}
    </>
  );
}
