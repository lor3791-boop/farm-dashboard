import { useRef, useState } from 'react';
import type { AppData } from '@/data/types';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { todayKST } from '@/lib/util';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const save = (blob: Blob, name: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };

export function BackupTab() {
  const { data } = useData();
  const { repo, email } = useAuth();
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AppData | null>(null);
  const [msg, setMsg] = useState('');
  if (!data) return null;

  const excel = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const s1 = wb.addWorksheet('농장');
    s1.addRow(['키', '농장', '농장주', '유형', '동 목록', '동 없이 관리', '규모', '주소', '위도', '경도', '거래개시일', '계약형태', '담당', '순서', '메모']);
    data.farms.forEach((f) => s1.addRow([f.id, f.name, f.owner, f.type, f.dongs.join(','), f.noDong ? 'Y' : '', f.scale, f.address, f.lat, f.lng, f.startDate, f.contractType, f.active ? 'Y' : 'N', f.order, f.memo]));
    const s2 = wb.addWorksheet('기준값');
    s2.addRow(['항목', '값']); Object.entries(data.thresholds).forEach(([k, v]) => s2.addRow([k, v]));
    const s3 = wb.addWorksheet('이름 맞춤표');
    s3.addRow(['종류', '파일에 적힌 이름', '어느 파일', '대시보드 이름', '담당 아님', '메모']);
    data.nameMap.forEach((r) => s3.addRow([r.kind, r.source, r.sourceFile, r.target, r.excluded ? 'Y' : '', r.memo]));
    [s1, s2, s3].forEach((s) => { s.getRow(1).font = { bold: true }; s.columns.forEach((c) => (c.width = 16)); });
    save(new Blob([await wb.xlsx.writeBuffer()]), `farm-dashboard-backup-${todayKST()}.xlsx`);
  };
  const json = () => save(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `farm-dashboard-backup-${todayKST()}.json`);
  const pick = async (f: File) => {
    try {
      const d = JSON.parse(await f.text()) as AppData;
      if (!Array.isArray(d.farms) || !d.thresholds || !Array.isArray(d.nameMap)) throw new Error();
      setPending(d); setMsg('');
    } catch { setPending(null); setMsg('백업 파일 형식이 아닙니다'); }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardTitle>백업 받기</CardTitle>
        <p className="mb-3 text-[14px] text-muted">설정 자료(농장·동, 기준값, 이름 맞춤표)를 파일로 받습니다. 엑셀은 확인용, JSON은 복원용입니다.</p>
        <div className="flex flex-wrap gap-2"><Button variant="primary" onClick={excel}>엑셀로 받기</Button><Button onClick={json}>복원용 파일(JSON) 받기</Button></div>
        <p className="mt-3 text-[12px] text-muted">매일 밤 구글 시트 자동 백업은 Firebase 연결 후 켭니다.</p>
      </Card>
      <Card>
        <CardTitle>복원</CardTitle>
        <p className="mb-3 text-[14px] text-muted">복원용 파일을 고르면 내용을 보여드리고, 확인을 눌러야 바뀝니다. 지금 설정은 모두 파일 내용으로 바뀝니다.</p>
        <input ref={file} type="file" accept=".json,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        <Button onClick={() => file.current?.click()}>파일 고르기</Button>
        {msg && <div className="mt-3"><Badge t={msg.includes('형식') ? 'bad' : 'ok'}>{msg}</Badge></div>}
        {pending && (
          <div className="mt-3 rounded-lg border border-line bg-bg p-3 text-[14px]">
            농장 {pending.farms.length}곳 · 이름 맞춤 {pending.nameMap.length}건
            <div className="mt-2 flex gap-2">
              <Button variant="primary" size="sm" onClick={async () => { await repo!.replaceAll(pending, email); await repo!.log('백업 복원', `${pending.farms.length}곳`, email); setPending(null); setMsg('복원했습니다'); }}>이 내용으로 복원</Button>
              <Button variant="ghost" size="sm" onClick={() => setPending(null)}>취소</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
