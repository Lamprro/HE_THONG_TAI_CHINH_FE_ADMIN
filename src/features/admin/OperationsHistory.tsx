import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { API_BASE, getJson, requestJson } from '../../shared/api/client';
import { Drawer, Panel, QueryState } from '../../shared/components/Ui';
import { ApiResult, Records, type Row } from './Records';
import { CommandTracker } from './CommandTracker';
import type { WorkflowSelection } from './WorkflowPage';

export function OperationsHistory({ kind, onRun, onWorkflow }: { kind: 'commands' | 'runs' | 'quality' | 'audit'; onRun: (id: string) => void; onWorkflow: (selection: WorkflowSelection) => void }) {
  const initial = kind === 'commands' ? 'admin_commands' : kind === 'runs' ? 'ingestion_runs' : kind === 'audit' ? 'admin_operation_events' : 'validation_results';
  const [table, setTable] = useState(initial); const [page, setPage] = useState(0); const [status, setStatus] = useState(''); const [query, setQuery] = useState(''); const [filter, setFilter] = useState(''); const [target, setTarget] = useState('');
  const [command, setCommand] = useState<string | null>(null); const [issue, setIssue] = useState<Row | null>(null);
  const data = useQuery({ queryKey: ['operation-history', table, page, filter], queryFn: () => getJson<{ rows: Row[]; total: number }>(API_BASE, `/api/admin/console/data/${table}?page=${page}&size=25${filter}`), refetchInterval: kind === 'commands' ? 5000 : false });
  return <div className="admin-stack"><Panel title={kind === 'commands' ? 'Lịch sử và điều khiển tác vụ' : kind === 'runs' ? 'Toàn bộ lượt chạy nguồn' : kind === 'audit' ? 'Nhật ký thao tác quản trị' : 'Lỗi, quy tắc và phiên bản'} note="Đọc toàn bộ lịch sử theo trang, không giới hạn ở mẫu gần nhất. Lỗi validation và ghi chú xử lý được lưu riêng.">
    {kind === 'quality' && <label>Danh mục<select aria-label="Danh mục chất lượng" value={table} onChange={e => { setTable(e.target.value); setFilter(''); setPage(0); }}><option value="validation_results">Kết quả validation</option><option value="data_versions">Phiên bản dữ liệu</option><option value="validation_rules">Catalog luật</option></select></label>}
    <form className="toolbar filters" onSubmit={e => { e.preventDefault(); setPage(0); setFilter(`&search=${encodeURIComponent(query)}${status ? `&status=${encodeURIComponent(status)}` : ''}${table === 'validation_results' && target ? `&validation_target=${target}` : ''}`); }}>
      <label>Tìm mã / ID / nội dung<input value={query} onChange={e => setQuery(e.target.value)} maxLength={100}/></label>
      {!['admin_operation_events', 'validation_rules'].includes(table) && <label>Trạng thái<input value={status} onChange={e => setStatus(e.target.value)} placeholder="FAILED, FAIL, ACTIVE…"/></label>}
      {table === 'validation_results' && <label>Đối tượng validation<select aria-label="Đối tượng validation" value={target} onChange={e => setTarget(e.target.value)}><option value="">Tất cả</option><option value="RAW_PAYLOAD">Dữ liệu nguồn</option><option value="LLM_OUTPUT">Đầu ra AI</option></select></label>}
      <button className="primary-button">Lọc lịch sử</button>
    </form><QueryState query={data}><Records rows={data.data?.rows ?? []} onRun={onRun} actions={row => <>
      {table === 'admin_commands' && <button className="text-button" onClick={() => setCommand(String(row.id))}>Theo dõi / xử lý</button>}
      {table === 'ingestion_runs' && <><button className="text-button" onClick={() => onRun(String(row.id))}>Mở lượt chạy</button><button className="text-button" onClick={() => onWorkflow({ mode: 'PROCESS_RUN', runId: String(row.id) })}>Tiếp tục validation/build</button></>}
      {table === 'data_versions' && row.status === 'ACTIVE' && <button className="text-button" onClick={() => onWorkflow({ mode: 'BUILD_VERSION', versionId: String(row.id) })}>Build version này</button>}
      {table === 'validation_results' && <button className="text-button" onClick={() => setIssue(row)}>Ghi nhận xử lý lỗi</button>}
    </>}/><div className="toolbar"><span>{data.data?.total.toLocaleString('vi-VN')} bản ghi · Trang {page + 1}</span><button className="light-button" disabled={!page || data.isFetching} onClick={() => setPage(p => p - 1)}>Trang trước</button><button className="light-button" disabled={!data.data || (page + 1) * 25 >= data.data.total || data.isFetching} onClick={() => setPage(p => p + 1)}>Trang sau</button><button className="text-button" onClick={() => data.refetch()}>Tải lại</button></div></QueryState>
    <p className="subtle">ACTIVE đã được validation chấp nhận; ACTIVATED đã qua build. Ghi chú vận hành không đổi FAIL thành PASS. Chỉ chọn tiếp tục/build cho nguồn và builder tương ứng.</p>
  </Panel>{command && <CommandTracker key={command} id={command} onRun={onRun} onCommand={setCommand}/>} {issue && <IssueReview key={String(issue.id)} issue={issue} close={() => setIssue(null)} onRun={onRun}/>}</div>;
}
function IssueReview({ issue, close, onRun }: { issue: Row; close: () => void; onRun: (id: string) => void }) {
  const [note, setNote] = useState('');
  const path = `/api/admin/console/issues/${issue.id}/reviews`;
  const reviews = useQuery({ queryKey: ['issue-reviews', issue.id], queryFn: () => getJson<Row[]>(API_BASE, path) });
  const save = useMutation({ mutationFn: () => requestJson(API_BASE, path, 'POST', { reason: note }), retry: false, onSuccess: () => { setNote(''); void reviews.refetch(); } });
  return <Drawer title="Điều tra và ghi chú lỗi" subtitle={String(issue.rule_code)} onClose={close}><ApiResult value={issue}/>{typeof issue.ingestion_run_id === 'string' && <button className="light-button" onClick={() => onRun(issue.ingestion_run_id as string)}>Mở nguồn gây lỗi</button>}
    <label>Ghi chú xử lý<textarea aria-label="Ghi chú xử lý" value={note} maxLength={2000} onChange={e => setNote(e.target.value)}/></label><button className="primary-button" disabled={!note.trim() || save.isPending} onClick={() => save.mutate()}>Lưu ghi chú audit</button>{save.error && <p role="alert">{save.error.message}</p>}<p>Trạng thái validation gốc được giữ nguyên. Lấy lại nguồn hoặc sửa flow rồi chạy lại để tạo bằng chứng mới.</p><QueryState query={reviews}><Records rows={reviews.data ?? []}/></QueryState></Drawer>;
}
