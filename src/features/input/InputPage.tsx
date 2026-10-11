// 입력 — 폐사 / 출하 / 전입·배치 / 사료·백신비 (목업 v5)
import { useRef, useState } from 'react';
import { useHerd } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { dongsOf, REF } from '@/lib/calc/herd';
import { fmt, md } from '@/lib/calc/dates';
import { Tabs } from '@/components/v5';
import { todayKST } from '@/lib/util';
import { ShipManualButton, ShipManualList } from './ShipManual';
import { ShareDeaths } from './ShareDeaths';

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
  const { all, farms, passFarm, s, set } = useHerd();
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
    await repo!.addDeath({ date, farm: s.dFarm, dong: s.dDong ?? '', group: chosen, count: cnt }, email);
    setSavedOk(true); setSaved(`저장됨: ${s.dFarm} ${chosen} 폐사 ${cnt}두 · ${md(date)}`);
    setCnt(1);
  };
  const entryRows = all.filter((r) => passFarm(r.farm)).map((r) => {
    const ds = dongsOf(r.dong);
    const mode = r.dong === '—' ? 'group' : ds.some((x) => all.filter((o) => o.farm === r.farm && dongsOf(o.dong).includes(x)).length > 1) ? 'pick' : 'auto';
    return { key: r.who, farm: r.farm, group: r.group, dong: r.dong === '—' ? '동 없이 관리' : r.dong, date: md(r.date), stock: fmt(r.stock), mode: mode === 'auto' ? '자동' : mode === 'pick' ? '그룹 선택' : '그룹만', cls: mode === 'auto' ? 'chip ok' : 'chip warn' };
  });
  const totStock = all.reduce((a, r) => a + r.stock, 0);
  const pill = (on: boolean) => (on ? 'pill on' : 'pill');
  const gcols = '1fr 0.7fr 1.2fr 0.8fr 0.8fr 1fr';

  return (
    <>
      <Tabs opts={[['death', '폐사'], ['ship', '출하'], ['entry', '전입·배치'], ['feed', '사료·백신비']]} value={s.inTab} onPick={(k) => set({ inTab: k })} />
      {s.inTab === 'death' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: 16 }}>
          <div className="card" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
              {[1, 2, 3].map((n) => <div key={n} style={{ width: 90, height: 90, borderRadius: 8, background: '#DCD6C9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#56645E' }}>사진 {n}</div>)}
            </div>
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{cover.map((r) => <button key={r.group} className={pill(s.dGroup === r.group)} onClick={() => { set({ dGroup: r.group }); setSaved(''); }}>{r.group} (재고 {fmt(r.stock)})</button>)}</div>
              </>
            )}
            {auto && <div style={{ marginTop: 12 }}><span className="chip ok">자동 연결: {s.dFarm} {cover[0].group} (재고 {fmt(cover[0].stock)})</span></div>}
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
          <ShareDeaths />
        </div>
      )}
      {s.inTab === 'ship' && (
        <>
          <div className="card">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
              <div><div style={{ fontWeight: 700 }}>등급판정서 올리기</div></div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}><FilePick label="파일 선택" /><ShipManualButton /></div>
            </div>
            <div style={{ marginTop: 14, padding: '12px 14px', background: '#F4F2EC', borderRadius: 8, fontSize: 14, lineHeight: 1.8 }}>
              <b>10.06(화) 최진수(68두)등판자료.xls</b> · 도축장 양식 인식<br />
              출하자 최진수 → <b>민서</b> (이름 맞춤표) · 판정일 2026-10-06 · 작업장 (유)금돈 · 68두 · 도체중 합계 5,773kg · 이력번호 2개 (21두 / 47두)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end', marginTop: 16 }}>
              <label style={{ fontSize: 14 }}>계근중량 (생체, kg)<br /><input type="number" defaultValue={7715} style={{ width: 160 }} /></label>
              <label style={{ fontSize: 14 }}>출하처<br /><select><option>(주)일호이앤에프</option><option>참푸른글로벌</option><option>음성신선공장(팜스코)</option></select></label>
              <div style={{ fontSize: 14 }}>평체 <b>113.5kg</b> · 지육률 <b>74.8%</b></div>
            </div>
            <h2 className="h2" style={{ marginTop: 20 }}>그룹 분할 (도체번호 순서)</h2>
            <div className="tblbox"><table>
              <thead><tr><th>구간</th><th>도체번호</th><th className="r">두수</th><th>배정 그룹</th><th className="r">1+</th><th className="r">1</th><th className="r">2</th><th className="r">등외</th></tr></thead>
              <tbody>
                {([[1, '1318~1330', 13, 8, 4, 1], [2, '1331~1347', 17, 3, 5, 9], [3, '1348~1386', 38, 11, 17, 10]] as const).map(([n, rg, h, a, b, c]) => (
                  <tr key={n}><td>{n}</td><td>{rg}</td><td className="r">{h}</td><td><select aria-label={'구간 ' + n + ' 배정 그룹'}><option>민서 26-7</option><option>민서 26-6</option><option>민서 26-8</option></select></td><td className="r">{a}</td><td className="r">{b}</td><td className="r">{c}</td><td className="r">0</td></tr>
                ))}
              </tbody>
            </table></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <button className="btn">+ 구간 추가</button><button className="btn">이력번호별로 나누기</button><button className="btn pri">저장 (재고 차감)</button>
            </div>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h2 className="h2">출하실적종합 대조</h2>
            <div className="tblbox"><table>
              <thead><tr><th>출하일</th><th>농장</th><th className="r">두수</th><th className="r">계근중량(입력)</th><th className="r">생체중(종합)</th><th>결과</th></tr></thead>
              <tbody><tr><td>10/06</td><td>민서</td><td className="r">68</td><td className="r">7,715</td><td className="r">7,715 (1,475+1,929+4,311)</td><td><span className="chip ok">일치</span></td></tr></tbody>
            </table></div>
          </div>
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
              <div className="gr gh" style={{ gridTemplateColumns: gcols, minWidth: 560 }}><div>농장</div><div>그룹</div><div>동</div><div>전입일</div><div className="r">재고</div><div>폐사 입력</div></div>
              {entryRows.map((g) => <div key={g.key} className="gr" style={{ gridTemplateColumns: gcols, minWidth: 560 }}><div>{g.farm}</div><div>{g.group}</div><div>{g.dong}</div><div>{g.date}</div><div className="r">{g.stock}</div><div><span className={g.cls}>{g.mode}</span></div></div>)}
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
