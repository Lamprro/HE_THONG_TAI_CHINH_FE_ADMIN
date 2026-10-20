import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { API_BASE, getJson } from '../../shared/api/client';
import { Panel } from '../../shared/components/Ui';
import { safeObject } from '../../shared/utils/format';
import type { DataSource, IngestionJob } from '../dashboard/types/dto';
import type { Security } from '../data-scope/contracts';
import { CommandTracker, submitCommand } from './CommandTracker';
import type { Row } from './Records';

const operations = ['OHLCV', 'QUOTE', 'FINANCIAL_STATEMENT', 'RATIO', 'INDEX_OHLCV', 'INDEX_MEMBERS', 'FOREIGN_TRADES', 'COMPANY'];
const builders = ['MARKET_PRICE_BUILD', 'FINANCIAL_STATEMENT_BUILD', 'FINANCIAL_METRIC_BUILD', 'INDEX_PRICE_BUILD', 'INDEX_MEMBERSHIP_BUILD', 'FOREIGN_TRADE_BUILD', 'SECURITY_REFERENCE_BUILD'];
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export interface WorkflowSelection { mode?: string; runId?: string; versionId?: string }
export function WorkflowPage({ initial = {}, onRun }: { initial?: WorkflowSelection; onRun: (id: string) => void }) {
  const [mode, setMode] = useState(initial.mode ?? 'INGEST_VALIDATE_BUILD'); const [operation, setOperation] = useState('OHLCV');
  const [source, setSource] = useState(''); const [symbol, setSymbol] = useState('');
  const [start, setStart] = useState(''); const [end, setEnd] = useState(today());
  const [statement, setStatement] = useState('balance_sheet'); const [period, setPeriod] = useState('quarter');
  const [runId, setRun] = useState(initial.runId ?? ''); const [version, setVersion] = useState(initial.versionId ?? ''); const [jobId, setJob] = useState('');
  const [params, setParams] = useState('{}'); const [reason, setReason] = useState(''); const [error, setError] = useState('');
  const [review, setReview] = useState<Row | null>(null); const [command, setCommand] = useState<string | null>(null); const sending = useRef(false);
  const sources = useQuery({ queryKey: ['sources'], queryFn: () => getJson<DataSource[]>(API_BASE, '/api/data-sources') });
  const jobs = useQuery({ queryKey: ['jobs'], queryFn: () => getJson<IngestionJob[]>(API_BASE, '/api/ingestion-jobs?activeOnly=false') });
  const securities = useQuery({ queryKey: ['securities'], queryFn: () => getJson<Security[]>(API_BASE, '/api/securities?activeOnly=false') });
  const submit = useMutation({ mutationFn: (request: Row) => submitCommand(String(request.action), request.input, String(request.reason), String(request.idempotencyKey)), retry: false, onSuccess: result => { setCommand(String(result.id)); setReview(null); } });
  const prepare = () => {
    try {
      if (!reason.trim()) throw new Error('Ghi lý do vận hành.');
      let input: unknown;
      if (mode === 'PROCESS_RUN') { if (!runId) throw new Error('Chọn lượt chạy nguồn cần tiếp tục.'); input = { runId }; }
      else if (mode === 'BUILD_VERSION') { if (!jobId || !version) throw new Error('Chọn builder và version cần build.'); input = { jobId, versionId: version }; }
      else if (mode === 'RUN_JOB') { if (!jobId) throw new Error('Chọn job.'); input = { jobId }; }
      else {
        const dataSource = sources.data?.find(s => s.code === source && s.active);
        if (!dataSource || !symbol.trim()) throw new Error('Chọn nguồn đang bật và mã chứng khoán/chỉ số.');
        if (start && start > end) throw new Error('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
        if (['OHLCV', 'INDEX_OHLCV', 'FOREIGN_TRADES'].includes(operation) && (!start || !end)) throw new Error('Chọn rõ khoảng ngày bắt đầu và kết thúc.');
        const parameters = JSON.parse(params);
        if (!parameters || Array.isArray(parameters) || typeof parameters !== 'object' || Object.values(parameters).some(v => typeof v !== 'string')) throw new Error('Tham số nâng cao phải là object chứa các giá trị chuỗi.');
        if (operation === 'FINANCIAL_STATEMENT') Object.assign(parameters, { statement, period, limit: period === 'quarter' ? '52' : '13' });
        input = { operation, provider: dataSource.provider, dataSourceCode: source, symbol: symbol.trim().toUpperCase(), ...(start ? { startDate: start } : {}), ...(end && (operation !== 'RATIO' || start) ? { endDate: end } : {}), parameters };
      }
      setReview({ action: mode, input, reason: reason.trim(), idempotencyKey: crypto.randomUUID() }); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Yêu cầu không hợp lệ.'); }
  };
  const execute = async () => { if (!review || sending.current) return; sending.current = true; try { await submit.mutateAsync(review); } catch { /* Same request key remains available. */ } finally { sending.current = false; } };
  return <div className="admin-stack"><Panel title="Luồng xử lý dữ liệu" note="Lấy dữ liệu qua Python → kiểm tra bằng luật Java → build đúng batch vào bảng cuối. Không quét batch của công việc khác.">
    <fieldset disabled={!!review || submit.isPending}><div className="admin-form-grid">
      <label>Cách xử lý<select aria-label="Cách xử lý" value={mode} onChange={e => setMode(e.target.value)}><option value="INGEST_VALIDATE_BUILD">Lấy nguồn → validation → build</option><option value="PROCESS_RUN">Tiếp tục từ nguồn đã lưu</option><option value="BUILD_VERSION">Build một version đã qua validation</option><option value="RUN_JOB">Chạy workflow/job đang cấu hình</option></select></label>
      {mode === 'INGEST_VALIDATE_BUILD' && <>
        <label>Loại dữ liệu<select aria-label="Loại dữ liệu" value={operation} onChange={e => setOperation(e.target.value)}>{operations.map(o => <option key={o}>{o}</option>)}</select></label>
        <label>Nguồn dữ liệu<select aria-label="Nguồn dữ liệu" value={source} onChange={e => setSource(e.target.value)}><option value="">Chọn nguồn…</option>{sources.data?.filter(s => s.active && s.sourceType === 'API').map(s => <option key={s.code} value={s.code}>{s.name} · {s.provider}</option>)}</select></label>
        <label>Mã chứng khoán/chỉ số<input aria-label="Mã chứng khoán/chỉ số" list="workflow-symbols" value={symbol} onChange={e => setSymbol(e.target.value)}/><datalist id="workflow-symbols">{securities.data?.map(s => <option key={s.id} value={s.symbol}/>)}</datalist></label>
        <label>Từ ngày<input type="date" value={start} onChange={e => setStart(e.target.value)}/></label><label>Đến ngày<input type="date" value={end} onChange={e => setEnd(e.target.value)}/></label>
        {operation === 'FINANCIAL_STATEMENT' && <><label>Loại báo cáo<select value={statement} onChange={e => setStatement(e.target.value)}><option value="balance_sheet">Bảng cân đối kế toán</option><option value="income_statement">Kết quả kinh doanh</option><option value="cash_flow">Lưu chuyển tiền tệ</option></select></label><label>Chu kỳ<select value={period} onChange={e => setPeriod(e.target.value)}><option value="quarter">Quý · tối đa 52 kỳ theo nguồn</option><option value="year">Năm · tối đa 13 kỳ theo nguồn</option></select></label></>}
      </>}
      {mode === 'PROCESS_RUN' && <label>Lượt chạy nguồn<input aria-label="Lượt chạy nguồn" value={runId} onChange={e => setRun(e.target.value)}/></label>}
      {mode === 'BUILD_VERSION' && <label>Version ID<input aria-label="Version ID" value={version} onChange={e => setVersion(e.target.value)}/></label>}
      {['BUILD_VERSION', 'RUN_JOB'].includes(mode) && <label>Workflow/job<select aria-label="Workflow/job" value={jobId} onChange={e => setJob(e.target.value)}><option value="">Chọn job…</option>{jobs.data?.filter(j => mode === 'RUN_JOB' || builders.includes(j.code)).map(j => <option key={j.id} value={j.id}>{j.name} · {j.code} · {j.active ? 'bật' : 'tắt'}</option>)}</select></label>}
    </div>{mode === 'INGEST_VALIDATE_BUILD' && <details><summary>Tham số nguồn nâng cao</summary><textarea rows={5} aria-label="Tham số nguồn nâng cao" value={params} onChange={e => setParams(e.target.value)}/></details>}
    <label>Lý do xử lý<textarea aria-label="Lý do xử lý" value={reason} maxLength={2000} onChange={e => setReason(e.target.value)}/></label></fieldset>
    {sources.error || jobs.error || securities.error ? <p className="state-error">Không tải được một phần danh mục. Kiểm tra kết nối trước khi gửi.</p> : null}
    {error && <p role="alert" className="state-error">{error}</p>}
    {review ? <div className="confirmation"><h3>Xác nhận phạm vi xử lý</h3><pre>{safeObject(review)}</pre><p>Chỉ dữ liệu vượt qua validation mới được build. Nguồn có thể không có đủ lịch sử; hệ thống giữ nguyên các khoảng thiếu.</p><button className="primary-button" disabled={submit.isPending} onClick={() => void execute()}>Xác nhận chạy luồng</button><button className="light-button" disabled={submit.isPending} onClick={() => setReview(null)}>Sửa phạm vi</button></div> : <button className="primary-button" onClick={prepare}>Kiểm tra phạm vi</button>}
    {submit.error && <p className="state-error" role="alert">{submit.error.message}</p>}
  </Panel>{command && <CommandTracker key={command} id={command} onRun={onRun} onCommand={setCommand}/>}</div>;
}
