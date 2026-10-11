import { useEffect, useState } from 'react';
import type { Thresholds } from '@/data/types';
import { SEED_THRESHOLDS } from '@/data/seed';
import { THRESHOLD_GROUPS } from '@/data/thresholdMeta';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';

export function ThresholdsTab() {
  const { data } = useData();
  const { repo, email } = useAuth();
  const [t, setT] = useState<Thresholds | null>(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { if (data && !t) setT(data.thresholds); }, [data, t]);
  if (!t || !data) return null;
  const dirty = JSON.stringify(t) !== JSON.stringify(data.thresholds);
  const bad = Object.values(t).some((v) => typeof v === 'number' && (Number.isNaN(v) || v < 0));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" disabled={!dirty || bad} onClick={async () => { await repo!.saveThresholds(t, email); await repo!.log('기준값 수정', '', email); setMsg('저장했습니다'); }}>저장</Button>
        <Button variant="ghost" disabled={!dirty} onClick={() => { setT(data.thresholds); setMsg(''); }}>되돌리기</Button>
        <Button variant="ghost" onClick={() => { setT({ ...SEED_THRESHOLDS }); setMsg('기본값을 불러왔습니다. 저장을 눌러야 반영됩니다'); }}>설계서 기본값</Button>
        {dirty && <Badge t="warn">저장하지 않은 변경</Badge>}
        {bad && <Badge t="bad">숫자를 확인하세요</Badge>}
        {msg && !dirty && <Badge t="ok">{msg}</Badge>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {THRESHOLD_GROUPS.map((g) => (
          <Card key={g.title}>
            <CardTitle>{g.title}</CardTitle>
            <div className="divide-y divide-line2">
              {g.items.map((it) => {
                const changed = t[it.k] !== SEED_THRESHOLDS[it.k];
                return (
                  <label key={it.k} className="flex items-center gap-3 py-2">
                    <span className="flex-1 text-[14px]">{it.label}{changed && <span className="ml-1.5 text-[11px] text-warn-fg">기본 {SEED_THRESHOLDS[it.k]}</span>}</span>
                    <Input className="tnum w-[88px] text-right" inputMode="decimal" value={Number.isNaN(t[it.k]) ? '' : t[it.k]} onChange={(e) => setT({ ...t, [it.k]: e.target.value === '' ? NaN : Number(e.target.value) })} />
                    <span className="w-[72px] text-[13px] text-muted">{it.unit}</span>
                  </label>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
