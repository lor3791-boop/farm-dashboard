import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, X } from 'lucide-react';
import type { Farm, FarmType, ContractType } from '@/data/types';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select, Textarea, Check } from '@/components/ui/field';

const blank = (order: number): Farm => ({ id: '', name: '', owner: '', type: '위탁', dongs: [], noDong: false, scale: null, address: '', lat: null, lng: null, startDate: '', contractType: '당사기준', active: true, order, memo: '' });

// 농장 키: 이름에서 자동 생성 (한글 이름이면 f + 시각)
const makeId = (name: string, taken: string[]) => {
  let id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `f${Date.now().toString(36)}`;
  while (taken.includes(id)) id += 'x';
  return id;
};

export function FarmsTab() {
  const { data } = useData();
  const { repo, email } = useAuth();
  const [edit, setEdit] = useState<Farm | null>(null);
  const [showOff, setShowOff] = useState(false);
  const farms = useMemo(() => (data?.farms ?? []).filter((f) => showOff || f.active), [data, showOff]);

  const cols = useMemo<ColumnDef<Farm, any>[]>(() => [
    { accessorKey: 'name', header: '농장', cell: (c) => <span className={c.row.original.active ? '' : 'text-muted line-through'}>{c.getValue()}</span> },
    { accessorKey: 'type', header: '유형' },
    { id: 'dongs', header: '동 목록', accessorFn: (f) => f.dongs.join(' · '), cell: (c) => { const f = c.row.original; return f.noDong ? <Badge t="info">동 없이 관리</Badge> : f.dongs.length ? c.getValue() : <Badge t="warn">미등록</Badge>; } },
    { accessorKey: 'owner', header: '농장주' },
    { accessorKey: 'scale', header: '규모', meta: { right: true }, cell: (c) => (c.getValue() ? `${Number(c.getValue()).toLocaleString()}두` : '') },
    { accessorKey: 'address', header: '주소', cell: (c) => <span className="inline-block max-w-[220px] truncate align-bottom">{c.getValue()}</span> },
    { accessorKey: 'contractType', header: '계약형태' },
    { accessorKey: 'order', header: '순서', meta: { right: true } }
  ], []);

  return (
    <Card>
      <CardTitle right={
        <div className="flex flex-wrap items-center gap-2">
          <Check label="담당 해제 농장도 보기" checked={showOff} onChange={setShowOff} />
          <Button variant="primary" size="sm" onClick={() => setEdit(blank((data?.farms.length ?? 0) + 1))}><Plus size={15} aria-hidden="true" />농장 추가</Button>
        </div>
      }>농장·동 목록</CardTitle>
      <p className="mb-3 text-[13px] text-muted">줄을 누르면 수정합니다. 동은 폐사 입력과 동 배치표에서 쓰입니다. 농장을 지우지 않고 '담당 해제'로 숨기므로 과거 자료는 남습니다.</p>
      <DataTable data={farms} columns={cols} onRowClick={(f) => setEdit(structuredClone(f))} />
      {edit && <FarmDialog farm={edit} onClose={() => setEdit(null)} onSave={async (f) => {
        const isNew = !f.id;
        const v = isNew ? { ...f, id: makeId(f.name, data!.farms.map((x) => x.id)) } : f;
        await repo!.saveFarm(v, email);
        await repo!.log(isNew ? '농장 추가' : '농장 수정', v.name, email);
        setEdit(null);
      }} names={(data?.farms ?? []).filter((x) => x.id !== edit.id).map((x) => x.name)} />}
    </Card>
  );
}

function FarmDialog({ farm, onClose, onSave, names }: { farm: Farm; onClose: () => void; onSave: (f: Farm) => Promise<void>; names: string[] }) {
  const [f, setF] = useState<Farm>(farm);
  const [dongIn, setDongIn] = useState('');
  const [busy, setBusy] = useState(false);
  const up = <K extends keyof Farm>(k: K, v: Farm[K]) => setF((p) => ({ ...p, [k]: v }));
  const addDongs = () => {
    // "1,2,3" / "1·2·3" / "3-1동" 모두 받는다
    const parts = dongIn.split(/[,·\s]+/).map((s) => s.trim()).filter(Boolean).map((s) => (s.endsWith('동') ? s : `${s}동`));
    const next = [...f.dongs];
    parts.forEach((p) => { if (!next.includes(p)) next.push(p); });
    up('dongs', next); setDongIn('');
  };
  const nameErr = !f.name.trim() ? '농장 이름을 넣으세요' : names.includes(f.name.trim()) ? '같은 이름의 농장이 있습니다' : '';
  const num = (v: string) => (v.trim() === '' ? null : Number(v));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={farm.id ? `${farm.name} 수정` : '농장 추가'} wide footer={
      <>
        <Button variant="ghost" onClick={onClose}>취소</Button>
        <Button variant="primary" disabled={!!nameErr || busy} onClick={async () => { setBusy(true); try { await onSave({ ...f, name: f.name.trim() }); } finally { setBusy(false); } }}>{busy ? '저장 중…' : '저장'}</Button>
      </>
    }>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="농장 이름 (대시보드 표시)" hint={nameErr || undefined}><Input value={f.name} onChange={(e) => up('name', e.target.value)} /></Field>
        <Field label="농장주"><Input value={f.owner} onChange={(e) => up('owner', e.target.value)} /></Field>
        <Field label="유형"><Select value={f.type} onChange={(e) => up('type', e.target.value as FarmType)}><option>위탁</option><option>후기자돈사</option></Select></Field>
        <Field label="계약형태"><Select value={f.contractType} onChange={(e) => up('contractType', e.target.value as ContractType)}>{['당사기준', '출하두당', '전입두당', '기타'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <div className="sm:col-span-2">
          <div className="mb-1 text-[13px] font-medium text-[#4C5A54]">동 목록</div>
          <Check label="동 없이 그룹으로만 관리 (예: 명임)" checked={f.noDong} onChange={(v) => up('noDong', v)} />
          {!f.noDong && (
            <>
              <div className="my-2 flex flex-wrap gap-1.5">
                {f.dongs.length === 0 && <span className="text-[13px] text-muted">등록된 동이 없습니다</span>}
                {f.dongs.map((d) => (
                  <span key={d} className="inline-flex items-center gap-0.5 rounded-full bg-brand-50 py-0.5 pl-3 pr-0.5 text-[13px] text-brand">
                    {d}
                    <button aria-label={`${d} 빼기`} onClick={() => up('dongs', f.dongs.filter((x) => x !== d))} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-brand-100"><X size={14} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="예: 1,2,3-1" value={dongIn} onChange={(e) => setDongIn(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDongs(); } }} />
                <Button onClick={addDongs} disabled={!dongIn.trim()}>동 추가</Button>
              </div>
            </>
          )}
        </div>
        <Field label="사육 규모 (두)"><Input inputMode="numeric" value={f.scale ?? ''} onChange={(e) => up('scale', num(e.target.value))} /></Field>
        <Field label="거래개시일"><Input type="date" value={f.startDate} onChange={(e) => up('startDate', e.target.value)} /></Field>
        <Field label="주소" className="sm:col-span-2"><Input value={f.address} onChange={(e) => up('address', e.target.value)} /></Field>
        <Field label="위도" hint="드라이브 '농장_좌표표' 값"><Input inputMode="decimal" value={f.lat ?? ''} onChange={(e) => up('lat', num(e.target.value))} /></Field>
        <Field label="경도"><Input inputMode="decimal" value={f.lng ?? ''} onChange={(e) => up('lng', num(e.target.value))} /></Field>
        <Field label="표시 순서"><Input inputMode="numeric" value={f.order} onChange={(e) => up('order', Number(e.target.value) || 0)} /></Field>
        <div className="flex items-end"><Check label="담당 중" checked={f.active} onChange={(v) => up('active', v)} /></div>
        <Field label="메모" className="sm:col-span-2"><Textarea value={f.memo} onChange={(e) => up('memo', e.target.value)} /></Field>
      </div>
    </Dialog>
  );
}
