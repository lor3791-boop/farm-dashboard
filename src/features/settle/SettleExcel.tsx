// 정산자료 엑셀 — 그룹 하나를 골라 1파일 5시트 (정산요약·출하실적·사료·폭염·구제역 백신비)
import { useState } from 'react';
import { useHerd } from '@/lib/ui';
import { allShips } from '@/lib/calc/ship';
import { downloadXlsx } from '@/lib/xlsx';
import { useCol } from '@/lib/useCol';
import { mergeFeed, type FeedMid, type Vaccine, type FeedUpload } from '@/lib/feedSheet';

export function SettleExcel() {
  const { all, isPlanned, s, set, ships, saved } = useHerd();
  const [xMsg, setXMsg] = useState('');
  const SHIP = allShips(ships);
  const mids = useCol<FeedMid>('feedMid');
  const vacs = useCol<Vaccine>('vaccine');
  const feed = useCol<FeedUpload>('feed');
  // 정산자료
  const settleGroups = ['민서 26-3'].concat(all.filter((g) => isPlanned(g)).map((g) => g.who));
  const isEx = s.sGroup === '민서 26-3';
  const sheets: [string, string, string][] = isEx
    ? [['정산요약', '농장 · 전입 · 출하 · 폭염 · 육성률 96.5%', '1'], ['출하실적', '출하실적(복사) B~X열 그대로', '7행'], ['사료', '월 · 단계 · 사료명 · kg (4~9월)', '10행'], ['폭염', '일자 · 두수 · 정산 인정두수', '2행'], ['구제역 백신비', '접종일 · 대상 그룹 · 금액', '[금액]']]
    : [['정산요약', '정산예정 그룹 요약', '1'], ['출하실적', '출하실적종합에서 자동 수집', '…'], ['사료', '피그온 그룹 사료 사용', '…'], ['폭염', '정산 인정두수 직접 입력', '…'], ['구제역 백신비', '백신비 입력값', '…']];
  const downloadSettle = () => {
    const g = all.find((x) => x.who === s.sGroup);
    if (!g) { setXMsg('민서 26-3은 정산이 끝난 예시 그룹이라 대시보드 자료가 없습니다. 정산예정 그룹을 고르면 바로 내려받습니다.'); return; }
    const ships = SHIP.filter((x) => x[1] === g.farm && x[0] >= g.date);
    downloadXlsx('정산자료_' + g.who.replace(' ', '_'), [
      { name: '정산요약', head: ['농장', '그룹', '전입일', '실두수', '클레임', '전입(실정산)', '폐사', '출하', '재고', '육성률(%)', '예상육성률(%)'], rows: [[g.farm, g.group, g.date, g.inn, g.claim, g.net, g.death, g.sold, g.stock, g.surv, g.expSurv]] },
      { name: '출하실적', head: ['출하일', '농가', '출하처', '두수', '생체중량', '지육중량', '지급율', '1+', '1', '2', '등외'], rows: ships.map((x) => [...x]) },
      { name: '사료', head: ['월', '구분', '사료명', 'kg'], rows: [...mergeFeed(feed).filter((x) => x[0] === g.farm && x[1] === g.group).sort((a, b) => (a[2] < b[2] ? -1 : 1)).map((x) => [x[2], '피그온', x[3], x[4]]), ...mids.filter((m) => m.farm === g.farm && m.group === g.group).map((m) => [m.month, '중간투입', m.item, m.kg])] },
      { name: '폭염', head: ['일자', '피그온 폭염폐사', '정산 인정두수'], rows: saved.heatVals[g.who] ? [['', '', Number(saved.heatVals[g.who])]] : [] },
      { name: '구제역 백신비', head: ['접종일', '대상 그룹', '두수', '금액', '첨부'], rows: vacs.filter((v) => v.farm === g.farm && v.groups.includes(g.group)).map((v) => [v.date, v.groups.join(', '), v.heads ?? '', v.amount, v.fileName ?? '']) }
    ]);
    setXMsg('내려받았습니다. 출하실적은 이 농장의 전입일 이후 출하를 모두 담았으니 그룹 배정을 확인하세요.');
  };

  return (
        <>
          <div className="card">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'end', justifyContent: 'space-between' }}>
              <label className="small muted">정산 그룹<br /><select value={s.sGroup} onChange={(e) => { set({ sGroup: e.target.value }); setXMsg(''); }} style={{ minWidth: 280 }}>{settleGroups.map((w) => <option key={w} value={w}>{w + (w === '민서 26-3' ? ' (정산완료 · 예시 자료 있음)' : ' (정산예정)')}</option>)}</select></label>
              <button className="btn pri" onClick={downloadSettle}>엑셀 1파일 내려받기 (시트 5개)</button>
            </div>
            {xMsg && <div className="chip info" style={{ marginTop: 10, whiteSpace: 'normal' }}>{xMsg}</div>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 12, marginTop: 16 }}>
            {sheets.map(([n, d, c], i) => (
              <div key={n} className="card" style={{ padding: '14px 16px' }}>
                <div className="muted" style={{ fontSize: 12 }}>시트 {i + 1}</div>
                <div style={{ fontSize: 17, fontWeight: 700, margin: '2px 0 6px' }}>{n}</div>
                <div className="small">{d}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{c}</div>
              </div>
            ))}
          </div>
        </>
  );
}
