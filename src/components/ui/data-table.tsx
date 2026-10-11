// 공통 표 — UI 원칙: 열 제목 정렬, 줄 아무 곳이나 클릭, 머리줄·첫 열 고정, 빈 결과 안내.
import { useState } from 'react';
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from '@tanstack/react-table';
import { cn } from '@/lib/util';

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  onRowClick?: (row: T) => void;
  empty?: string;
  maxHeight?: number;
  rowClassName?: (row: T) => string;
}

export function DataTable<T>({ data, columns, onRowClick, empty = '표시할 자료가 없습니다.', maxHeight = 620, rowClassName }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({ data, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });
  return (
    <div className="overflow-auto rounded-lg" style={{ maxHeight }}>
      <table className="w-full border-collapse text-[14px]">
        <thead className="sticky top-0 z-[2] bg-white">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h, i) => {
                const right = (h.column.columnDef.meta as any)?.right;
                const s = h.column.getIsSorted();
                return (
                  <th key={h.id} className={cn('whitespace-nowrap border-b border-[#D9D3C6] bg-white px-2 py-1 text-left', i === 0 && 'sticky left-0 z-[3]')}>
                    {h.isPlaceholder ? null : h.column.getCanSort() ? (
                      <button onClick={h.column.getToggleSortingHandler()} className={cn('flex min-h-[32px] items-center gap-1 text-[13px] font-medium', s ? 'font-bold text-brand' : 'text-[#4C5A54]', right && 'ml-auto')}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <span className="text-[10px]">{s === 'asc' ? '▲' : s === 'desc' ? '▼' : '↕'}</span>
                      </button>
                    ) : (
                      <span className="text-[13px] font-medium text-[#4C5A54]">{flexRender(h.column.columnDef.header, h.getContext())}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 && (
            <tr><td colSpan={columns.length} className="px-2 py-6 text-center text-muted">{empty}</td></tr>
          )}
          {table.getRowModel().rows.map((r) => (
            <tr
              key={r.id}
              onClick={onRowClick ? () => onRowClick(r.original) : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(r.original); } : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={cn('group', onRowClick && 'cursor-pointer', rowClassName?.(r.original))}
            >
              {r.getVisibleCells().map((c, i) => {
                const right = (c.column.columnDef.meta as any)?.right;
                return (
                  <td key={c.id} className={cn('whitespace-nowrap border-b border-line2 bg-white px-2 py-2 group-hover:bg-[#F1F5F2]', right && 'text-right tnum', i === 0 && 'sticky left-0 z-[1] font-medium')}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
