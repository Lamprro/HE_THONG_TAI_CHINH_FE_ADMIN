import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE, getJson, requestJson } from '../../shared/api/client';
import { Panel, QueryState } from '../../shared/components/Ui';
import { ApiResult, Records, type Row } from './Records';
import { safeObject } from '../../shared/utils/format';

export function PromptManager() {
  const [selected, setSelected] = useState(''); const [version, setVersion] = useState(''); const [prompt, setPrompt] = useState(''); const [reason, setReason] = useState('');
  const [review, setReview] = useState<{ path: string; method: string; body: Row } | null>(null); const client = useQueryClient();
  const list = useQuery({ queryKey: ['prompt-catalog'], queryFn: () => getJson<Row[]>(API_BASE, '/api/admin/prompts') });
  const detail = useQuery({ queryKey: ['prompt-detail', selected], queryFn: () => getJson<Row>(API_BASE, `/api/admin/prompts/${selected}`), enabled: !!selected });
  const save = useMutation({ mutationFn: (request: { path: string; method: string; body: Row }) => requestJson<Row>(API_BASE, request.path, request.method, request.body), retry: false, onSuccess: result => { setReview(null); if (result.id) setSelected(String(result.id)); void client.invalidateQueries({ queryKey: ['prompt-catalog'] }); void client.invalidateQueries({ queryKey: ['prompt-detail'] }); } });
  return <Panel title="Quản lý phiên bản prompt" note="Tạo version mới ở trạng thái tắt, kiểm tra rồi bật riêng. Prompt và schema của các run cũ được giữ nguyên; version mới kế thừa hợp đồng input/output của bản gốc."><QueryState query={list}><Records rows={list.data ?? []} actions={row => <button className="text-button" onClick={() => { setSelected(String(row.id)); setPrompt(''); }}>Chọn template</button>}/></QueryState>
    {selected && <QueryState query={detail}><details><summary>Prompt, schema và checksum gốc</summary><ApiResult value={detail.data}/></details><label>Version mới<input aria-label="Version prompt mới" value={version} onChange={e => setVersion(e.target.value)} disabled={!!review}/></label><label>Nội dung prompt mới<textarea aria-label="Nội dung prompt mới" rows={12} value={prompt} onChange={e => setPrompt(e.target.value)} disabled={!!review}/></label><button className="light-button" disabled={!!review} onClick={() => setPrompt(String(detail.data?.system_prompt ?? ''))}>Lấy nội dung bản gốc để sửa</button>
      <label>Lý do thay đổi prompt<textarea aria-label="Lý do thay đổi prompt" value={reason} maxLength={2000} onChange={e => setReason(e.target.value)} disabled={!!review}/></label><div className="toolbar"><button className="primary-button" disabled={!version.trim() || !prompt.trim() || !reason.trim() || !!review} onClick={() => setReview({ path: '/api/admin/prompts', method: 'POST', body: { basedOnId: selected, version, prompt, reason } })}>Xem lại version mới</button><button className="light-button" disabled={!reason.trim() || !!review} onClick={() => setReview({ path: `/api/admin/prompts/${selected}/enabled`, method: 'PATCH', body: { enabled: !detail.data?.enabled, reason } })}>{detail.data?.enabled ? 'Chuẩn bị tắt version' : 'Chuẩn bị bật version'}</button></div>
    </QueryState>}
    {review && <div className="confirmation"><pre>{safeObject(review)}</pre><p>Bật một version sẽ tắt version hiện tại của cùng task; run cũ giữ liên kết bản đã dùng.</p><button className="primary-button" disabled={save.isPending} onClick={() => save.mutate(review)}>Xác nhận thay đổi prompt</button><button className="light-button" disabled={save.isPending} onClick={() => setReview(null)}>Quay lại</button></div>}{save.error && <p role="alert" className="state-error">{save.error.message}</p>}
  </Panel>;
}
