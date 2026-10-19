import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE, getJson } from '../../shared/api/client';
import { Panel, QueryState } from '../../shared/components/Ui';
import { Records, type Row } from './Records';
interface Dataset { name: string; available: boolean; columns: string[] }
interface Page { rows: Row[]; total: number; page: number; size: number }
export function DataBrowser({ onRun, onRaw }: { onRun: (id: string) => void; onRaw: (id: string) => void }) {
  const [table, setTable] = useState('ingestion_runs');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState(''); const [run, setRun] = useState(''); const [status, setStatus] = useState('');
  const [filter, setFilter] = useState('');
  const catalog = useQuery({ queryKey: ['admin-datasets'], queryFn: () => getJson<Dataset[]>(API_BASE, '/api/admin/console/datasets') });
  const data = useQuery({ queryKey: ['admin-data', table, page, filter], queryFn: () => getJson<Page>(API_BASE, `/api/admin/console/data/${table}?page=${page}&size=25${filter}`) });
  const selected = catalog.data?.find(d => d.name === table);
  const hasRun = selected?.columns.includes('ingestion_run_id');
  const hasStatus = selected?.columns.some(c => ['status', 'result_status'].includes(c));
  return <Panel title="Dữ liệu, lịch sử và nguồn gốc" note="Phân trang trực tiếp từ database. Số đếm là tổng bản ghi theo bộ lọc; bảng có thể chứa các phiên bản lịch sử. Không mặc nhiên coi mọi hàng là dữ liệu sạch hiện hành.">
    <QueryState query={catalog}><label>Bảng dữ liệu <select value={table} onChange={e => { setTable(e.target.value); setPage(0); setFilter(''); setSearch(''); setRun(''); setStatus(''); }}>{catalog.data?.map(d => <option key={d.name} value={d.name} disabled={!d.available}>{d.name}{!d.available ? ' · chưa triển khai' : ''}</option>)}</select></label></QueryState>
    <form className="toolbar filters" onSubmit={e => { e.preventDefault(); setPage(0); setFilter(`&search=${encodeURIComponent(search)}${hasRun && run ? `&runId=${encodeURIComponent(run)}` : ''}${hasStatus && status ? `&status=${encodeURIComponent(status)}` : ''}`); }}>
      <label>Tìm trong dữ liệu<input value={search} maxLength={100} onChange={e => setSearch(e.target.value)} placeholder="Mã chứng khoán, nội dung, ID…"/></label>
      {hasRun && <label>Lượt chạy gốc<input value={run} onChange={e => setRun(e.target.value)} placeholder="UUID ingestion run"/></label>}
      {hasStatus && <label>Trạng thái chính xác<input value={status} onChange={e => setStatus(e.target.value)} placeholder="FAILED / FAIL / ACTIVATED…"/></label>}
      <button className="primary-button">Áp dụng bộ lọc</button>
    </form>
    <p className="subtle">ACTIVE: đã qua validation. ACTIVATED: đã được bước build đưa vào bảng cuối. FAIL vẫn là lỗi dù người vận hành đã đọc. Các số thập phân được trả dưới dạng chuỗi để giữ nguyên độ chính xác.</p>
    <QueryState query={data}><Records key={`${table}-${page}-${filter}`} rows={data.data?.rows ?? []} onRun={onRun} onRaw={onRaw}/><div className="toolbar"><span>{data.data?.total.toLocaleString('vi-VN')} bản ghi · Trang {page + 1}</span><button className="light-button" disabled={page === 0 || data.isFetching} onClick={() => setPage(p => p - 1)}>Trang trước</button><button className="light-button" disabled={!data.data || (page + 1) * 25 >= data.data.total || data.isFetching} onClick={() => setPage(p => p + 1)}>Trang sau</button><button className="text-button" onClick={() => data.refetch()}>Tải lại dữ liệu</button></div></QueryState>
  </Panel>;
}
