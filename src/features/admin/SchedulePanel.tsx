import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { API_BASE, getJson, requestJson } from '../../shared/api/client';
import { Panel, QueryState } from '../../shared/components/Ui';
import { ApiResult, type Row } from './Records';
import { safeObject } from '../../shared/utils/format';
import type { IngestionJob } from '../dashboard/types/dto';

export function SchedulePanel() {
  const [editing, setEditing] = useState(false); const [enabled, setEnabled] = useState(false); const [codes, setCodes] = useState<string[]>([]); const [reason, setReason] = useState(''); const [review, setReview] = useState<Row | null>(null);
  const policy = useQuery({ queryKey: ['admin-schedule'], queryFn: () => getJson<Row>(API_BASE, '/api/admin/console/schedule'), refetchInterval: editing ? false : 30000 });
  const jobs = useQuery({ queryKey: ['jobs'], queryFn: () => getJson<IngestionJob[]>(API_BASE, '/api/ingestion-jobs?activeOnly=false'), enabled: editing });
  const save = useMutation({ mutationFn: (body: Row) => requestJson(API_BASE, '/api/admin/console/schedule', 'PUT', body), retry: false, onSuccess: () => { setReview(null); setEditing(false); void policy.refetch(); } });
  return <Panel title="Lịch chạy do admin quản lý" note="Mặc định tắt. Chỉ các job được chọn rõ ràng mới được kiểm tra cron; heartbeat và lần sweep là bằng chứng thực từ worker."><QueryState query={policy}><ApiResult value={policy.data}/><button className="light-button" disabled={editing} onClick={() => { setEditing(true); setEnabled(policy.data?.enabled === true); setCodes(Array.isArray(policy.data?.job_codes) ? policy.data.job_codes.map(String) : []); }}>Chỉnh phạm vi lịch</button></QueryState>
    {editing && <fieldset disabled={!!review || save.isPending}><label><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)}/>Bật lịch cho phạm vi đã chọn</label><label>Job trong phạm vi<select multiple aria-label="Job trong phạm vi lịch" value={codes} onChange={e => setCodes([...e.target.selectedOptions].map(o => o.value))}>{jobs.data?.filter(j => j.active && j.cronExpression).map(j => <option key={j.id} value={j.code}>{j.name} · {j.code} · {j.cronExpression}</option>)}</select></label><label>Lý do thay đổi lịch<textarea aria-label="Lý do thay đổi lịch" value={reason} onChange={e => setReason(e.target.value)} maxLength={2000}/></label><button className="primary-button" disabled={!reason.trim() || enabled && !codes.length} onClick={() => setReview({ enabled, jobCodes: codes, version: policy.data?.version, reason })}>Xem lại thay đổi lịch</button><button className="light-button" onClick={() => setEditing(false)}>Đóng</button></fieldset>}
    {review && <div className="confirmation"><pre>{safeObject(review)}</pre><p>Bật lịch sẽ cho phép gọi nguồn và ghi dữ liệu khi cron đến hạn. Tắt lịch ảnh hưởng các lần sweep tiếp theo; job đang chạy tiếp tục đến khi kết thúc.</p><button className="primary-button" disabled={save.isPending} onClick={() => save.mutate(review)}>Xác nhận cập nhật lịch</button><button className="light-button" disabled={save.isPending} onClick={() => setReview(null)}>Quay lại sửa</button></div>}{save.error && <p role="alert" className="state-error">{save.error.message}</p>}
  </Panel>;
}
