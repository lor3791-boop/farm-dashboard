import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { useData } from '@/lib/data';
import type { Farm } from '@/data/types';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { PageTitle } from '@/app/Layout';
import { todayKST } from '@/lib/util';

const Kpi = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-xl border border-line bg-white px-4 py-3.5">
    <div className="text-[13px] text-muted">{label}</div>
    <div className="tnum mt-1 text-[26px] font-bold leading-tight">{value}</div>
    {sub && <div className="mt-0.5 text-[12px] text-muted">{sub}</div>}
  </div>
);

export function HomePage() {
  const { data } = useData();
  const nav = useNavigate();
  const farms = useMemo(() => (data?.farms ?? []).filter((f) => f.active), [data]);
  const contract = farms.filter((f) => f.type === '위탁');
  const nursery = farms.filter((f) => f.type === '후기자돈사');
  const dongCount = contract.reduce((s, f) => s + f.dongs.length, 0);

  const cols = useMemo<ColumnDef<Farm, any>[]>(() => [
    { accessorKey: 'name', header: '농장' },
    { accessorKey: 'type', header: '유형', cell: (c) => <Badge t={c.getValue() === '위탁' ? 'muted' : 'info'}>{c.getValue()}</Badge> },
    { id: 'dongs', header: '동', accessorFn: (f) => (f.noDong ? '' : f.dongs.join(' · ')), cell: (c) => { const f = c.row.original; return f.noDong ? <span className="text-muted">동 없이 그룹으로 관리</span> : f.dongs.length ? c.getValue() : <Badge t="warn">동 미등록</Badge>; } },
    { id: 'dn', header: '동 수', accessorFn: (f) => f.dongs.length, meta: { right: true } },
    { accessorKey: 'owner', header: '농장주', cell: (c) => c.getValue() || <span className="text-muted">—</span> },
    { id: 'stock', header: '재고', enableSorting: false, cell: () => <span className="text-muted">묶음 2</span>, meta: { right: true } }
  ], []);

  return (
    <>
      <PageTitle title="홈" sub={`${todayKST()} 기준 · 재고·작업 알림·정산예정은 묶음 2부터 채워집니다`} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="담당 위탁농장" value={`${contract.length}곳`} />
        <Kpi label="후기자돈사" value={`${nursery.length}곳`} sub={nursery.map((f) => f.name).join(', ')} />
        <Kpi label="등록된 동" value={`${dongCount}개`} sub="위탁농장 합계" />
        <Kpi label="현재 재고" value="—" sub="돈수불 업로드 후 (묶음 2)" />
      </div>
      <Card>
        <CardTitle>농장 현황</CardTitle>
        <DataTable data={farms} columns={cols} onRowClick={() => nav('/settings')} empty="담당 농장이 없습니다. 설정에서 농장을 추가하세요." />
      </Card>
    </>
  );
}
