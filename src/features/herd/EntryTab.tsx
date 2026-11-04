// 전입등록 — 피그온 전입현황·돈수불 업로드(묶음 2) / 그룹 직접 등록 / 동 배치표(크레임·폐사 포함)
import { useRef, useState } from 'react';
import { useHerd } from '@/lib/ui';
import { dongsOf } from '@/lib/calc/herd';
import { fmt, md } from '@/lib/calc/dates';
import { GroupAdd, ManualGroupList } from './GroupAdd';

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

export function EntryTab() {
  const { all, passFarm } = useHerd();
  const [add, setAdd] = useState(false);
  const entryRows = all.filter((r) => passFarm(r.farm)).map((r) => {
    const ds = dongsOf(r.dong);
    const mode = r.dong === '—' ? 'group' : ds.some((x) => all.filter((o) => o.farm === r.farm && dongsOf(o.dong).includes(x)).length > 1) ? 'pick' : 'auto';
    return { key: r.who, farm: r.farm, group: r.group, dong: r.dong === '—' ? '동 없이 관리' : r.dong, date: md(r.date), inn: fmt(r.inn), claim: fmt(r.claim), claimDead: r.claimDead, claimLeft: fmt(r.claimLeft), death: fmt(r.death), surv: r.surv, bad: r.bad, stock: fmt(r.stock), mode: mode === 'auto' ? '자동' : mode === 'pick' ? '그룹 선택' : '그룹만', cls: mode === 'auto' ? 'chip ok' : 'chip warn' };
  });
  const totStock = all.reduce((a, r) => a + r.stock, 0);
  const gcols = '0.9fr 0.6fr 1.1fr 0.6fr 0.75fr 0.9fr 0.65fr 0.7fr 0.75fr 0.9fr';
  return (
    <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 14 }}>
            <div className="card"><div style={{ fontWeight: 700 }}>피그온 전입현황</div><div style={{ marginTop: 10 }}><span className="chip ok">10/8 업로드 · 로트 반영 완료</span></div><FilePick label="새 파일 올리기" style={{ marginTop: 12 }} /></div>
            <div className="card"><div style={{ fontWeight: 700 }}>피그온 돈수불</div><div style={{ marginTop: 10 }}><span className="chip ok">재고 그룹 {all.length}개 · {fmt(totStock)}두</span></div><FilePick label="새 파일 올리기" style={{ marginTop: 12 }} /></div>
            <div className="card"><div style={{ fontWeight: 700 }}>직접 입력</div><button className="btn pri" style={{ marginTop: 22 }} onClick={() => setAdd(true)}>+ 그룹 직접 등록</button></div>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h2 className="h2" style={{ marginBottom: 10 }}>동 배치표</h2>
            <div className="gt">
              <div className="gr gh" style={{ gridTemplateColumns: gcols, minWidth: 900 }}><div>농장</div><div>그룹</div><div>동</div><div>전입일</div><div className="r">전입(실두수)</div><div className="r">크레임 (폐사/남음)</div><div className="r">폐사</div><div className="r">육성률</div><div className="r">재고</div><div>폐사 입력</div></div>
              {entryRows.map((g) => <div key={g.key} className="gr" style={{ gridTemplateColumns: gcols, minWidth: 900 }}><div>{g.farm}</div><div>{g.group}</div><div>{g.dong}</div><div>{g.date}</div><div className="r">{g.inn}</div><div className="r">{g.claim}<div className="sub" style={{ fontSize: 12 }}>{g.claimDead}/{g.claimLeft}</div></div><div className="r">{g.death}</div><div className="r" style={{ color: g.bad ? '#9A3216' : undefined }}>{g.surv}%</div><div className="r b">{g.stock}</div><div><span className={g.cls}>{g.mode}</span></div></div>)}
            </div>
          </div>
      <ManualGroupList />
      {add && <GroupAdd onClose={() => setAdd(false)} />}
    </>
  );
}
