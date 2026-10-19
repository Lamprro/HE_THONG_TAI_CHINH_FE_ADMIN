import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IngestionJob } from '../dashboard/types/dto';
import { API_BASE, getJson, requestJson } from '../../shared/api/client';
import { Panel, QueryState } from '../../shared/components/Ui';
import { ApiResult, Records, type Row } from './Records';
import { safeObject } from '../../shared/utils/format';

export function CommandPage({ jobs }: { jobs: IngestionJob[] }) {
  const [action, setAction] = useState('RUN_JOB'); const [jobId, setJob] = useState('');
  const [rawId, setRaw] = useState(''); const [limit, setLimit] = useState(50);
  const [replayRun, setReplayRun] = useState('');
  const [manual, setManual] = useState('{"operation":"OHLCV","provider":"vndirect","symbol":"FPT","startDate":"2026-10-01","endDate":"2026-10-16","parameters":{}}');
  const [reason, setReason] = useState(''); const [review, setReview] = useState<Row | null>(null);
  const [error, setError] = useState(''); const [commandId, setCommandId] = useState<string | null>(null);
  const [page, setPage] = useState(0); const sending = useRef(false); const client = useQueryClient();
  const history = useQuery({ queryKey: ['admin-commands', page], queryFn: () => getJson<{ rows: Row[]; total: number }>(API_BASE, `/api/admin/console/data/admin_commands?page=${page}&size=25`), refetchInterval: 5000 });
  const command = useQuery({ queryKey: ['admin-command', commandId], queryFn: () => getJson<Row>(API_BASE, `/api/admin/console/commands/${commandId}`), enabled: !!commandId,
    refetchInterval: q => ['QUEUED', 'RUNNING'].includes(String(q.state.data?.status)) ? 2000 : false });
  const submit = useMutation({ mutationFn: (body: Row) => requestJson<Row>(API_BASE, '/api/admin/console/commands', 'POST', body), retry: false,
    onSuccess: data => { setCommandId(String(data.id)); setReview(null); void client.invalidateQueries({ queryKey: ['admin-commands'] }); } });
  const prepare = () => {
    try {
      if (!reason.trim()) throw new Error('Ghi rõ lý do để lưu vào lịch sử điều hành.');
      const input = action === 'RUN_JOB' ? { jobId } : action === 'VALIDATE_RAW' ? { rawPayloadId: rawId } : action === 'VALIDATE_PENDING' ? { limit } : action === 'REPLAY_RUN' ? { runId: replayRun } : JSON.parse(manual);
      if (action === 'RUN_JOB' && !jobId) throw new Error('Chọn job cần chạy.');
      if (action === 'VALIDATE_RAW' && !rawId) throw new Error('Điền ID raw payload.');
      if (action === 'REPLAY_RUN' && !replayRun) throw new Error('Điền ID lượt lấy dữ liệu gốc.');
      setReview({ idempotencyKey: crypto.randomUUID(), action, reason: reason.trim(), input }); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Nội dung không hợp lệ.'); }
  };
  const execute = async () => {
    if (!review || sending.current) return; sending.current = true;
    try { await submit.mutateAsync(review); } catch { /* Preserve the same idempotency key for transport retries. */ }
    finally { sending.current = false; }
  };
  return <div className="admin-stack"><Panel title="Chạy luồng hiện có" note="Tác vụ chạy trên server và có ID theo dõi. Chạy job một lần không bật lịch cron. Builder vẫn dùng validation và luật chất lượng hiện có.">
    <label>Thao tác<select aria-label="Thao tác" value={action} disabled={!!review} onChange={e => setAction(e.target.value)}><option value="RUN_JOB">Chạy job / build dữ liệu một lần</option><option value="REPLAY_RUN">Lấy lại nguồn theo yêu cầu gốc</option><option value="MANUAL_INGESTION">Lấy dữ liệu từ nguồn Python qua Java</option><option value="VALIDATE_RAW">Kiểm tra raw payload</option><option value="VALIDATE_PENDING">Kiểm tra batch đang chờ</option></select></label>
    {action === 'RUN_JOB' && <label>Job<select aria-label="Job" value={jobId} disabled={!!review} onChange={e => setJob(e.target.value)}><option value="">Chọn job…</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.name} · {j.code} · {j.active ? 'đang bật' : 'đã tắt'}</option>)}</select></label>}
    {action === 'MANUAL_INGESTION' && <label>Yêu cầu lấy dữ liệu (JSON)<textarea rows={8} value={manual} disabled={!!review} onChange={e => setManual(e.target.value)}/><small>Dùng “Luồng & API quản trị” nếu cần nhập từng trường; không chèn token hoặc thông tin kết nối.</small></label>}
    {action === 'REPLAY_RUN' && <label>ID lượt lấy dữ liệu gốc<input value={replayRun} disabled={!!review} onChange={e => setReplayRun(e.target.value)}/><small>Tạo lượt chạy mới theo tham số nguồn đã lưu, giữ lịch sử cũ. Builder nội bộ cần chọn lại job sau khi kiểm tra cấu hình.</small></label>}
    {action === 'VALIDATE_RAW' && <label>Raw payload ID<input value={rawId} disabled={!!review} onChange={e => setRaw(e.target.value)}/></label>}
    {action === 'VALIDATE_PENDING' && <label>Số payload tối đa<input type="number" min={1} max={100} value={limit} disabled={!!review} onChange={e => setLimit(Number(e.target.value))}/></label>}
    <label>Lý do vận hành<textarea value={reason} maxLength={2000} disabled={!!review} onChange={e => setReason(e.target.value)}/></label>
    {error && <p role="alert" className="state-error">{error}</p>}
    {review ? <><pre>{safeObject(review)}</pre><p>Kiểm tra nguồn, mã và khoảng thời gian. Không tự chạy lại khi tác vụ cũ còn RUNNING hoặc chưa rõ kết quả.</p><button className="primary-button" disabled={submit.isPending} onClick={() => void execute()}>{submit.isPending ? 'Đang gửi…' : 'Xác nhận gửi tác vụ'}</button><button className="light-button" disabled={submit.isPending} onClick={() => setReview(null)}>Sửa yêu cầu</button></> : <button className="primary-button" onClick={prepare}>Xem lại yêu cầu</button>}
    {submit.error && <p role="alert" className="state-error">{submit.error.message} Nếu mất kết nối, giữ nguyên yêu cầu để gửi lại cùng khóa chống trùng, hoặc kiểm tra lịch sử.</p>}
    {commandId && <QueryState query={command}><h3>Tác vụ {commandId}</h3><ApiResult value={command.data}/><p className="subtle">SUCCEEDED xác nhận lời gọi kết thúc; xem status trong kết quả và data version để biết dữ liệu đã qua build. Không có nút hủy tác vụ đang thực thi vì luồng nguồn chưa hỗ trợ ngắt an toàn.</p>{command.data?.status === 'UNKNOWN' && <button className="light-button" disabled={!reason.trim()} onClick={async () => { try { await requestJson(API_BASE, `/api/admin/console/commands/${commandId}/acknowledge`, 'POST', { reason }); await command.refetch(); } catch (cause) { setError(String(cause)); } }}>Đã kiểm tra lượt chạy gốc, ghi nhận kết quả chưa xác định</button>}</QueryState>}
  </Panel><Panel title="Lịch sử điều hành" note="Lưu lý do, trạng thái, kết quả và lỗi. Danh tính là token admin chung, chưa phải tài khoản người dùng."><QueryState query={history}><Records rows={history.data?.rows ?? []}/><div className="toolbar"><span>{history.data?.total} tác vụ</span><button className="light-button" disabled={!page} onClick={() => setPage(p => p - 1)}>Trước</button><button className="light-button" disabled={!history.data || (page + 1) * 25 >= history.data.total} onClick={() => setPage(p => p + 1)}>Sau</button></div><label>Mở ID tác vụ<input value={commandId ?? ''} onChange={e => setCommandId(e.target.value || null)}/></label></QueryState></Panel></div>;
}
