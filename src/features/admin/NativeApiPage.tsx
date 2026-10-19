import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE, getJson, requestJson } from '../../shared/api/client';
import { Panel, QueryState } from '../../shared/components/Ui';
import { safeObject } from '../../shared/utils/format';
import { ApiResult } from './Records';

interface Field { name: string; type: string; format?: string; enum?: string[]; fields?: Field[]; items?: Field; location?: string; required?: boolean; defaultValue?: string }
interface Endpoint { id: string; method: string; path: string; operation: string; controller: string; inputs: Field[] }
const groups = [ ['all', 'Tất cả chức năng'], ['ingestion', 'Job & lấy dữ liệu'], ['validation', 'Validation & phiên bản'], ['forecasts', 'Dự báo tài chính'], ['llm', 'LLM & prompt'], ['news-recovery', 'Khôi phục tin & duyệt'], ['financial-data', 'Chất lượng & chỉ số'], ['market', 'Giá & chỉ số thị trường'], ['macro', 'Kinh tế vĩ mô'] ];
const labels: Record<string,string> = { jobId: 'Job ID', rawPayloadId: 'Raw payload ID', articleId: 'Bài viết ID', runId: 'Lượt chạy ID', securityId: 'Chứng khoán ID', asOfDate: 'Ngày chốt dữ liệu', horizonQuarters: 'Số quý dự báo (1–8)', targets: 'Chỉ tiêu dự báo', requireMacro: 'Yêu cầu dữ liệu vĩ mô', reviewer: 'Người duyệt', reason: 'Lý do', documentUrls: 'URL tài liệu (tối đa 3)', startDate: 'Từ ngày', endDate: 'Đến ngày', symbol: 'Mã chứng khoán', dataSourceCode: 'Mã nguồn dữ liệu', cronExpression: 'Lịch cron UTC (6 trường)', timeoutSeconds: 'Timeout (giây)', maxRetries: 'Ngân sách retry (10)', parameters: 'Tham số nguồn (JSON)', active: 'Bật lịch / kích hoạt', provider: 'Nhà cung cấp', limit: 'Số lượng tối đa', operation: 'Thao tác nguồn', name: 'Tên hiển thị', code: 'Mã định danh', statement: 'Loại báo cáo' };
function matches(group: string, e: Endpoint) {
  if (group === 'all') return true;
  if (group === 'ingestion') return /ingestion|data-sources|raw-payloads/.test(e.path);
  return e.path.includes(group);
}
function Input({ field, value, change }: { field: Field; value: string; change: (value: string) => void }) {
  const label = labels[field.name] ?? field.name.replace(/([A-Z])/g, ' $1');
  let control;
  if (field.type === 'boolean' || field.enum) control = <select aria-label={label} value={value} onChange={e => change(e.target.value)}><option value="">Dùng mặc định / bỏ trống</option>{(field.enum ?? ['true', 'false']).map(o => <option key={o}>{o}</option>)}</select>;
  else if (field.type === 'array' && field.items?.enum) control = <select aria-label={label} multiple value={value ? JSON.parse(value) : []} onChange={e => change(JSON.stringify([...e.target.selectedOptions].map(o => o.value)))}>{field.items.enum.map(o => <option key={o}>{o}</option>)}</select>;
  else if (['object', 'array'].includes(field.type)) control = <textarea aria-label={label} rows={4} value={value} placeholder={field.type === 'array' ? '["..."]' : '{}'} onChange={e => change(e.target.value)}/>;
  else control = <input aria-label={label} value={value} required={field.required} type={field.format === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'} onChange={e => change(e.target.value)}/>;
  return <label>{label}{field.required ? ' *' : ''}{control}{field.format === 'uuid' && <small>ID có trong “Tra cứu dữ liệu” hoặc phần Data Scope.</small>}</label>;
}
function parse(field: Field, value: string): unknown {
  if (!value.trim()) return undefined;
  if (field.type === 'boolean') return value === 'true';
  if (field.type === 'number') { const n = Number(value); if (!Number.isFinite(n)) throw new Error(`${field.name}: số không hợp lệ`); return n; }
  if (['object', 'array'].includes(field.type)) return JSON.parse(value);
  return value;
}
function EndpointForm({ endpoint }: { endpoint: Endpoint }) {
  const [values, setValues] = useState<Record<string,string>>({});
  const [review, setReview] = useState<{ path: string; body?: unknown } | null>(null);
  const [reason, setReason] = useState(''); const [error, setError] = useState(''); const sending = useRef(false);
  const idempotency = useRef(crypto.randomUUID()); const client = useQueryClient();
  const body = endpoint.inputs.find(i => i.location === 'body');
  const fields = endpoint.inputs.flatMap(i => i.location === 'body' && i.fields ? i.fields.map(f => ({ ...f, location: 'bodyField' })) : [i]);
  const mutation = useMutation({ mutationFn: async (request: { path: string; body?: unknown }) => {
    let action: string | undefined; let input: unknown;
    if (endpoint.method === 'POST' && /^\/api\/ingestion-jobs\/[^/]+\/run$/.test(request.path)) { action = 'RUN_JOB'; input = { jobId: values.jobId }; }
    if (endpoint.method === 'POST' && /^\/api\/ingestion-jobs\/[^/]+\/versions\/[^/]+\/build$/.test(request.path)) { action = 'BUILD_MARKET_PRICE_VERSION'; input = { jobId: values.jobId, versionId: values.versionId }; }
    if (endpoint.method === 'POST' && request.path === '/api/ingestions/manual') { action = 'MANUAL_INGESTION'; input = request.body; }
    if (endpoint.method === 'POST' && /^\/api\/admin\/validation\/raw-payloads\//.test(request.path)) { action = 'VALIDATE_RAW'; input = { rawPayloadId: values.rawPayloadId }; }
    if (endpoint.method === 'POST' && request.path.startsWith('/api/admin/validation/pending')) { action = 'VALIDATE_PENDING'; input = { limit: Number(values.limit || 50) }; }
    return action ? requestJson(API_BASE, '/api/admin/console/commands', 'POST', { idempotencyKey: idempotency.current, action, input, reason }) : requestJson(API_BASE, request.path, endpoint.method, request.body);
  }, retry: false, onSettled: () => { void client.invalidateQueries(); } });
  const prepare = () => {
    try {
      let path = endpoint.path; const query = new URLSearchParams(); const bodyFields: Record<string,unknown> = {}; let requestBody: unknown;
      for (const field of fields) {
        const value = values[field.name] ?? field.defaultValue ?? '';
        if (field.required && !value.trim() && field.location !== 'bodyField') throw new Error(`Thiếu ${field.name}`);
        const parsed = parse(field, value);
        if (parsed === undefined) continue;
        if (field.location === 'path') path = path.replace(`{${field.name}}`, encodeURIComponent(String(parsed)));
        else if (field.location === 'query') query.set(field.name, String(parsed));
        else if (field.location === 'bodyField') bodyFields[field.name] = parsed;
        else requestBody = parsed;
      }
      if (path.includes('{')) throw new Error('Điền đầy đủ ID trên đường dẫn.');
      if (body?.fields) requestBody = bodyFields;
      if (endpoint.method !== 'GET' && !reason.trim()) throw new Error('Ghi lý do trước khi xác nhận thao tác.');
      const request = { path: path + (query.size ? `?${query}` : ''), body: requestBody };
      setError(''); idempotency.current = crypto.randomUUID();
      if (endpoint.method === 'GET') void mutation.mutateAsync(request).catch(() => {}); else setReview(request);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Yêu cầu không hợp lệ.'); }
  };
  const execute = async () => {
    if (!review || sending.current) return; sending.current = true;
    try { await mutation.mutateAsync(review); setReview(null); } catch { /* Keep request and idempotency key for an explicit retry. */ }
    finally { sending.current = false; }
  };
  return <div className="native-form"><h3>{endpoint.operation}</h3><p className="mono break">{endpoint.method} {endpoint.path}</p><p className="subtle">{endpoint.controller} · hợp đồng lấy trực tiếp từ backend đang kết nối.</p>
    <p>Với forecast, đọc cấu hình và preview trước execute. Recovery chỉ phân tích sau khi admin duyệt. Kiểm tra validation và bảng cuối sau các bước ingest/build; không sửa FAIL thành PASS trên dashboard.</p>
    <fieldset disabled={!!review || mutation.isPending}><div className="admin-form-grid">{fields.map(f => <Input key={`${f.location}-${f.name}`} field={f} value={values[f.name] ?? f.defaultValue ?? ''} change={v => setValues(current => ({ ...current, [f.name]: v }))}/>)}</div>
    {endpoint.method !== 'GET' && <label>Lý do kiểm tra / vận hành<textarea aria-label="Lý do kiểm tra / vận hành" value={reason} maxLength={2000} onChange={e => setReason(e.target.value)}/><small>Tác vụ ingestion/validation được ghi vào sổ điều hành. Các luồng AI dùng audit riêng của backend; ghi lý do duyệt vào trường reason nếu API có hỗ trợ.</small></label>}</fieldset>
    {error && <p role="alert" className="state-error">{error}</p>}
    {review ? <><h3>Xác nhận thay đổi</h3><pre>{safeObject(review)}</pre><p>Thao tác có thể ghi database hoặc gọi dịch vụ AI có tính phí. Kiểm tra cấu hình và đối tượng trước khi thực hiện.</p><button className="primary-button" disabled={mutation.isPending} onClick={() => void execute()}>Xác nhận thực hiện</button><button className="light-button" disabled={mutation.isPending} onClick={() => setReview(null)}>Quay lại sửa</button></> : <button className="primary-button" disabled={mutation.isPending} onClick={prepare}>{mutation.isPending ? 'Đang xử lý…' : endpoint.method === 'GET' ? 'Đọc dữ liệu' : 'Xem lại thao tác'}</button>}
    {mutation.error && <p className="state-error" role="alert">{mutation.error.message}</p>}
    {mutation.isSuccess && <div role="status"><h3>Kết quả từ backend</h3><ApiResult value={mutation.data}/><p className="subtle">Nếu nhận ID tác vụ QUEUED/RUNNING, theo dõi trong “Điều hành tác vụ”. Tác vụ nguồn không tự chạy các bước build tiếp theo trừ khi workflow hiện có đã làm việc đó.</p></div>}
  </div>;
}
export function NativeApiPage() {
  const [group, setGroup] = useState('all'); const [search, setSearch] = useState(''); const [selected, setSelected] = useState('');
  const catalog = useQuery({ queryKey: ['native-catalog'], queryFn: () => getJson<Endpoint[]>(API_BASE, '/api/admin/console/catalog'), staleTime: 60000 });
  const options = catalog.data?.filter(e => matches(group, e) && `${e.path} ${e.operation} ${e.controller}`.toLowerCase().includes(search.toLowerCase())) ?? [];
  const endpoint = options.find(e => e.id === selected);
  return <Panel title="Luồng & API quản trị" note="Gồm quản lý job, source/master data, validation, build/chỉ số, LLM, forecast, prompt và duyệt recovery. Chỉ hiển thị endpoint thực sự có trong bản backend đang chạy.">
    <QueryState query={catalog}><div className="toolbar filters"><label>Nhóm chức năng<select aria-label="Nhóm chức năng" value={group} onChange={e => { setGroup(e.target.value); setSelected(''); }}>{groups.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Tìm chức năng<input value={search} onChange={e => setSearch(e.target.value)} placeholder="seed, recalculate, preview, approve…"/></label><span>{options.length} / {catalog.data?.length} API</span></div>
    <label>Chức năng cần thao tác<select aria-label="Chức năng cần thao tác" value={selected} onChange={e => setSelected(e.target.value)}><option value="">Chọn chức năng…</option>{options.map(e => <option key={e.id} value={e.id}>{e.method} · {e.operation} · {e.path}</option>)}</select></label>
    {endpoint && <EndpointForm key={endpoint.id} endpoint={endpoint}/>}</QueryState>
  </Panel>;
}
