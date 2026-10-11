// 농장 공유 화면에서 사장님·직원이 등록한 폐사 — 확인하면 목록에서 지운다
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useCol } from '@/lib/useCol';
import { md } from '@/lib/calc/dates';

interface SD { token: string; farm: string; date: string; dong: string; group: string; count: number }
export function ShareDeaths() {
  const rows = useCol<SD>('shareDeaths');
  const { repo } = useAuth();
  const [busy, setBusy] = useState('');
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <div className="card">
      <h2 className="h2" style={{ marginBottom: 8 }}>농장에서 등록한 폐사 · {rows.length}건</h2>
      {sorted.map((x) => (
        <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #EFEBE3', fontSize: 14 }}>
          <span style={{ width: 48 }}>{md(x.date)}</span><b style={{ flex: 1 }}>{x.farm} {x.group}{x.dong ? ' · ' + x.dong + '동' : ''}</b><b>{x.count}두</b>
          <button className="btn sm" disabled={busy === x.id} onClick={async () => { setBusy(x.id); await repo!.remove('shareDeaths', x.id); setBusy(''); }}>확인</button>
        </div>
      ))}
    </div>
  );
}
