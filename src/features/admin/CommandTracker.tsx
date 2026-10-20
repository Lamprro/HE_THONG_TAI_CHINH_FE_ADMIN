import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE, getJson, requestJson } from '../../shared/api/client';
import { Badge, Panel, QueryState } from '../../shared/components/Ui';
import { ApiResult, type Row } from './Records';
import { dateTime, safeObject } from '../../shared/utils/format';

export const submitCommand = (action: string, input: unknown, reason: string, idempotencyKey: string) => requestJson<Row>(API_BASE, '/api/admin/console/commands', 'POST', { action, input, reason, idempotencyKey });
export function CommandTracker({ id, onRun, onCommand }: { id: string; onRun: (id: string) => void; onCommand: (id: string) => void }) {
  const [reason, setReason] = useState(''); const [review, setReview] = useState<string | null>(null);
  const key = useRef(crypto.randomUUID()); const sending = useRef(false); const client = useQueryClient();
  const command = useQuery({ queryKey: ['admin-command', id], queryFn: () => getJson<Row>(API_BASE, `/api/admin/console/commands/${id}`), refetchInterval: q => !q.state.data || ['QUEUED', 'RUNNING'].includes(String(q.state.data.status)) ? 2000 : false });
  const mutation = useMutation({ retry: false, mutationFn: async () => requestJson<Row>(API_BASE, `/api/admin/console/commands/${id}/${review}`, 'POST', { reason, reviewed: true, idempotencyKey: key.current }), onSuccess: value => { setReview(null); if (value.id !== id) onCommand(String(value.id)); void client.invalidateQueries(); } });
  const data = command.data;
  const progress = data?.progress_json as Row | undefined; const result = data?.result_json as Row | undefined;
  const runIds = [...new Set([progress?.sourceRunId, result?.sourceRunId, result?.runId, (result?.execution as Row | undefined)?.runId, (result?.build as Row | undefined)?.runId].filter((v): v is string => typeof v === 'string'))];
  const outcome = String(typeof result?.eligible === 'boolean' ? result.eligible ? 'READY_FOR_EXECUTION' : 'INPUT_NOT_ELIGIBLE' : result?.status ?? (result?.build as Row | undefined)?.status ?? '');
  const execute = async () => { if (sending.current || !reason.trim()) return; sending.current = true; try { await mutation.mutateAsync(); } catch { /* Retain key for uncertain transport outcomes. */ } finally { sending.current = false; } };
  return <Panel title="Tiến trình và kết quả" note={id}><QueryState query={command}>
    <div className="toolbar"><Badge tone={data?.status === 'FAILED' || data?.status === 'UNKNOWN' ? 'red' : data?.status === 'SUCCEEDED' ? 'green' : 'neutral'}>{String(data?.status)}</Badge>{progress?.stage ? <span>Bước: {String(progress.stage)}</span> : null}{outcome && <strong>Kết quả nghiệp vụ: {outcome}</strong>}</div>
    <p>{String(data?.reason ?? '')}</p><p className="subtle">Bắt đầu {dateTime(data?.started_at as string)} · Kết thúc {dateTime(data?.finished_at as string)}</p>
    {data?.error_message ? <p className="state-error" role="alert">{String(data.error_message)}</p> : null}
    {['REJECTED', 'VALIDATION_BLOCKED', 'COMPLETED_WITH_REJECTIONS', 'INPUT_NOT_ELIGIBLE', 'BLOCKED'].includes(outcome) && <p className="state-error">Dữ liệu chưa hoàn tất hoặc chưa đủ điều kiện. Kiểm tra luật và nguồn; tác vụ trả kết quả không đồng nghĩa dữ liệu đã sạch.</p>}
    {runIds.map(run => <button className="light-button" key={run} onClick={() => onRun(run)}>Mở lượt chạy {run.slice(0, 8)}</button>)}
    {data?.parent_command_id ? <button className="text-button" onClick={() => onCommand(String(data.parent_command_id))}>Mở tác vụ gốc</button> : null}
    {progress && <details open><summary>Các bước đã xử lý</summary><ApiResult value={progress}/></details>}
    {result && <details open><summary>Kết quả từ dịch vụ gốc</summary><ApiResult value={result}/></details>}
    <div className="toolbar">
      {data?.status === 'QUEUED' && <button className="light-button" onClick={() => { setReview('cancel'); key.current = crypto.randomUUID(); }}>Hủy tác vụ đang chờ</button>}
      {['FAILED', 'CANCELLED', 'ACKNOWLEDGED'].includes(String(data?.status)) && <button className="primary-button" onClick={() => { setReview('retry'); key.current = crypto.randomUUID(); }}>Kiểm tra và gửi lại</button>}
      {data?.status === 'UNKNOWN' && <button className="light-button" onClick={() => setReview('acknowledge')}>Ghi nhận đã kiểm tra kết quả gốc</button>}
    </div>
    {review && <div className="confirmation"><h3>{review === 'cancel' ? 'Hủy trước khi thực thi' : review === 'retry' ? 'Xác nhận đã kiểm tra lượt chạy cũ' : 'Xác nhận đã kiểm tra kết quả chưa rõ'}</h3><p>Kiểm tra các run ID và bảng cuối trước khi xác nhận. Luồng lấy–kiểm tra–build bị lỗi sau khi đã lưu nguồn sẽ tiếp tục trên nguồn đã lưu. Tác vụ đang RUNNING không bị ngắt.</p><label>Lý do xác nhận<textarea aria-label="Lý do xác nhận" maxLength={2000} value={reason} onChange={e => setReason(e.target.value)}/></label><button className="primary-button" disabled={!reason.trim() || mutation.isPending} onClick={() => void execute()}>Xác nhận xử lý tác vụ</button><button className="light-button" disabled={mutation.isPending} onClick={() => setReview(null)}>Quay lại</button>{mutation.error && <p role="alert" className="state-error">{mutation.error.message}</p>}</div>}
    <details><summary>Yêu cầu và thông tin audit</summary><pre>{safeObject(data)}</pre></details>
  </QueryState></Panel>;
}
