import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE, getJson } from '../../shared/api/client';
import { Panel, QueryState } from '../../shared/components/Ui';
import { Records, type Row } from './Records';
interface Dataset { name: string; available: boolean; columns: string[]; exactFilters?: string[] }
interface Page { rows: Row[]; total: number; page: number; size: number; omittedColumns?: string[] }
export function DataBrowser({ onRun, onRaw }: { onRun: (id: string) => void; onRaw: (id: string) => void }) {
  const [table, setTable] = useState('ingestion_runs');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState(''); const [run, setRun] = useState(''); const [status, setStatus] = useState('');
  const [filter, setFilter] = useState('');
  const [exact, setExact] = useState<Record<string,string>>({});
  const catalog = useQuery({ queryKey: ['admin-datasets'], queryFn: () => getJson<Dataset[]>(API_BASE, '/api/admin/console/datasets') });
  const data = useQuery({ queryKey: ['admin-data', table, page, filter], queryFn: () => getJson<Page>(API_BASE, `/api/admin/console/data/${table}?page=${page}&size=25${filter}`) });
  const selected = catalog.data?.find(d => d.name === table);
  const hasRun = selected?.columns.includes('ingestion_run_id');
  const hasStatus = selected?.columns.some(c => ['status', 'result_status'].includes(c));
  const exactKeys = selected?.exactFilters ?? ['id', 'raw_payload_id', 'data_version_id', 'security_id', 'llm_run_id', 'validation_target', 'data_source_id', 'ingestion_job_id'].filter(k => selected?.columns.includes(k));
  const research = table.startsWith('local_ai_');
  return <Panel title="Dữ liệu, lịch sử và nguồn gốc" note="Phân trang trực tiếp từ database. Số đếm là tổng bản ghi theo bộ lọc; bảng có thể chứa các phiên bản lịch sử. Không mặc nhiên coi mọi hàng là dữ liệu sạch hiện hành.">
    <QueryState query={catalog}><label>Bảng dữ liệu <select value={table} onChange={e => { setTable(e.target.value); setPage(0); setFilter(''); setSearch(''); setRun(''); setStatus(''); setExact({}); }}>{catalog.data?.map(d => <option key={d.name} value={d.name} disabled={!d.available}>{d.name}{!d.available ? ' · không có bảng này trong schema' : ''}</option>)}</select></label></QueryState>
    <form className="toolbar filters" onSubmit={e => { e.preventDefault(); setPage(0); setFilter(`&search=${encodeURIComponent(search)}${hasRun && run ? `&runId=${encodeURIComponent(run)}` : ''}${hasStatus && status ? `&status=${encodeURIComponent(status)}` : ''}${Object.entries(exact).filter(([,v]) => v).map(([k,v]) => `&${k}=${encodeURIComponent(v)}`).join('')}`); }}>
      <label>Tìm trong dữ liệu<input value={search} maxLength={100} onChange={e => setSearch(e.target.value)} placeholder="Mã, ID, lỗi; không tìm trong payload ẩn"/></label>
      {hasRun && <label>Lượt chạy gốc<input value={run} onChange={e => setRun(e.target.value)} placeholder="UUID ingestion run"/></label>}
      {hasStatus && <label>Trạng thái chính xác<input value={status} onChange={e => setStatus(e.target.value)} placeholder="FAILED / FAIL / ACTIVATED…"/></label>}
      {['is_canonical', 'is_current'].filter(k => selected?.columns.includes(k)).map(k => <label key={k}>{k === 'is_canonical' ? 'Dữ liệu canonical' : 'Phiên bản hiện hành'}<select aria-label={k} value={exact[k] ?? ''} onChange={e => setExact(v => ({ ...v, [k]: e.target.value }))}><option value="">Tất cả, gồm lịch sử</option><option value="true">Chỉ bản được chọn</option><option value="false">Chỉ bản lịch sử</option></select></label>)}
      <details><summary>Lọc chính xác nguồn gốc / ID</summary>{exactKeys.filter(k => !['is_canonical', 'is_current'].includes(k)).map(k => <label key={k}>{k}<input maxLength={200} value={exact[k] ?? ''} onChange={e => setExact(v => ({ ...v, [k]: e.target.value }))}/></label>)}</details>
      <button className="primary-button">Áp dụng bộ lọc</button>
      <button className="light-button" type="button" onClick={() => { setSearch(''); setRun(''); setStatus(''); setExact({}); setFilter(''); setPage(0); }}>Xóa bộ lọc</button>
    </form>
    <p aria-live="polite">Bộ lọc đang áp dụng: {filter ? [...new URLSearchParams(filter).entries()].filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(' · ') || 'Tất cả' : 'Tất cả'}. Thay đổi ô nhập cần bấm Áp dụng.</p>
    {research && <p role="note">Local AI · dữ liệu nghiên cứu. SUCCEEDED/CACHED xác nhận lượt xử lý, không chứng nhận độ chính xác hoặc quyền công bố. Tra cứu này không chạy model hay train; manifest, features và payload gọi model không hiển thị.</p>}
    {table === 'financial_disclosure_documents' && <p role="note">Tài liệu công bố độc lập với số vendor. Có tài liệu không có nghĩa báo cáo canonical đã được xác minh ngày, đơn vị hoặc phiên bản.</p>}
    <p className="subtle">ACTIVE: đã qua validation. ACTIVATED: đã được bước build đưa vào bảng cuối. FAIL vẫn là lỗi dù người vận hành đã đọc. Các số thập phân được trả dưới dạng chuỗi để giữ nguyên độ chính xác.</p>
    <QueryState query={data}><Records key={`${table}-${page}-${filter}`} rows={Array.isArray(data.data?.rows) ? data.data.rows : []} onRun={onRun} onRaw={onRaw}/><div className="toolbar"><span>{(data.data?.total ?? 0).toLocaleString('vi-VN')} bản ghi · Trang {page + 1}</span><button className="light-button" disabled={page === 0 || data.isFetching} onClick={() => setPage(p => p - 1)}>Trang trước</button><button className="light-button" disabled={!data.data || (page + 1) * 25 >= data.data.total || data.isFetching} onClick={() => setPage(p => p + 1)}>Trang sau</button><button className="text-button" onClick={() => data.refetch()}>Tải lại dữ liệu</button></div></QueryState>
  </Panel>;
}
