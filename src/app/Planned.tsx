// 아직 만들지 않은 메뉴 — 어느 묶음에서 무엇이 들어오는지 안내.
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BUNDLES, type MenuItem } from './menu';
import { PageTitle } from './Layout';

export function Planned({ m }: { m: MenuItem }) {
  return (
    <>
      <PageTitle title={m.label} sub={`묶음 ${m.bundle} · ${BUNDLES[m.bundle]}에서 만듭니다`} />
      <Card>
        <p className="mb-3 text-[14px] text-muted">목업 v5에서 정한 구성입니다.</p>
        <div className="flex flex-wrap gap-2">{m.tabs.map((t) => <Badge key={t} t="info">{t}</Badge>)}</div>
      </Card>
    </>
  );
}
