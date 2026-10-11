import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { NameMapRow, NameKind } from '@/data/types';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { uid } from '@/lib/util';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';

const KINDS: NameKind[] = ['농가', '농장주', '이력번호', '출하처', '그룹'];
const FILES = ['피그온', '출하실적종합', '등판서 출하자', '사료', '기타'];

export function NameMapTab() {
  const { data } = useData();
  const { repo, email } = useAuth();
  const [rows, setRows] = useState<NameMapRow[] | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => { if (data && !rows) setRows(data.nameMap); }, [data, rows]);
  if (!rows || !data) return null;
  const dirty = JSON.stringify(rows) !== JSON.stringify(data.nameMap);
  const farmNames = data.farms.map((f) => f.name);
  const up = (id: string, p: Partial<NameMapRow>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const dup = new Set(rows.map((r) => `${r.kind}|${r.source.trim()}`).filter((k, i, a) => a.indexOf(k) !== i));
  const shown = rows.filter((r) => !q || [r.source, r.target, r.memo].some((s) => s.includes(q)));
  const targetOpts = [...farmNames, ...rows.map((r) => r.target)].filter((v, i, a) => v && a.indexOf(v) === i);

  return (
    <Card>
      <CardTitle right={
        <div className="flex flex-wrap items-center gap-2">
          {dirty && <Badge t="warn">저장하지 않은 변경</Badge>}
          <Button size="sm" variant="ghost" disabled={!dirty} onClick={() => setRows(data.nameMap)}>되돌리기</Button>
          <Button size="sm" variant="primary" disabled={!dirty || dup.size > 0} onClick={async () => { await repo!.saveNameMap(rows.filter((r) => r.source.trim()), email); await repo!.log('이름 맞춤표 수정', `${rows.length}건`, email); }}>저장</Button>
        </div>
      }>이름 맞춤표</CardTitle>
      <div className="mb-3 flex flex-wrap gap-2">
        <Input className="max-w-[260px]" placeholder="이름 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button size="md" onClick={() => setRows([...rows, { id: uid(), kind: '농가', source: '', sourceFile: '피그온', target: '', excluded: false, memo: '' }])}><Plus size={15} aria-hidden="true" />줄 추가</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-[14px]">
          <thead><tr className="border-b border-[#D9D3C6] text-left text-[13px] text-[#4C5A54]">
            <th className="px-1.5 py-2 font-medium">종류</th><th className="px-1.5 font-medium">파일에 적힌 이름</th><th className="px-1.5 font-medium">어느 파일</th><th className="px-1.5 font-medium">대시보드 이름</th><th className="px-1.5 font-medium">담당 아님</th><th className="px-1.5 font-medium">메모</th><th />
          </tr></thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted">맞는 이름이 없습니다</td></tr>}
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-line2">
                <td className="px-1.5 py-1.5"><Select className="w-[96px]" value={r.kind} onChange={(e) => up(r.id, { kind: e.target.value as NameKind })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</Select></td>
                <td className="px-1.5"><Input aria-label="파일에 적힌 이름" value={r.source} onChange={(e) => up(r.id, { source: e.target.value })} className={dup.has(`${r.kind}|${r.source.trim()}`) ? 'border-bad-fg' : ''} /></td>
                <td className="px-1.5"><Select className="w-[140px]" value={r.sourceFile} onChange={(e) => up(r.id, { sourceFile: e.target.value })}>{[...new Set([...FILES, r.sourceFile])].map((k) => <option key={k}>{k}</option>)}</Select></td>
                <td className="px-1.5"><Input aria-label="대시보드 이름" list="nm-targets" disabled={r.excluded} value={r.target} onChange={(e) => up(r.id, { target: e.target.value })} /></td>
                <td className="px-1.5 text-center"><input type="checkbox" aria-label="담당 아님" className="h-[18px] w-[18px] accent-brand" checked={r.excluded} onChange={(e) => up(r.id, { excluded: e.target.checked, target: e.target.checked ? '' : r.target })} /></td>
                <td className="px-1.5"><Input aria-label="메모" value={r.memo} onChange={(e) => up(r.id, { memo: e.target.value })} /></td>
                <td className="px-1.5"><Button size="icon" variant="ghost" aria-label="줄 삭제" onClick={() => setRows(rows.filter((x) => x.id !== r.id))}><Trash2 size={16} /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <datalist id="nm-targets">{targetOpts.map((n) => <option key={n} value={n} />)}</datalist>
      </div>
      {dup.size > 0 && <p className="mt-2 text-[13px] text-bad-fg">같은 종류에 같은 이름이 두 번 있습니다. 하나를 지우세요.</p>}
    </Card>
  );
}
