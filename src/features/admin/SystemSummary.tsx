import { useQuery } from '@tanstack/react-query';
import { API_BASE, getJson } from '../../shared/api/client';
import { Panel, QueryState } from '../../shared/components/Ui';
import { Records, type Row } from './Records';
export function SystemSummary() {
  const summary = useQuery({ queryKey: ['system-summary'], queryFn: () => getJson<Record<string, Row[]>>(API_BASE, '/api/admin/console/summary'), refetchInterval: 30000 });
  const total = (key: string, condition: (row: Row) => boolean = () => true) => summary.data?.[key]?.filter(condition).reduce((n, r) => n + Number(r.count), 0) ?? '—';
  return <Panel title="Toàn hệ thống" note="Đếm trực tiếp trên database, không phải mẫu 20/50 bản ghi gần nhất."><QueryState query={summary}><div className="metrics-grid six">{[['Job đã bật', total('jobs', r => r.is_active === true)], ['Tổng lượt chạy', total('runs')], ['Tác vụ đang chạy', total('commands', r => r.status === 'RUNNING')], ['Tác vụ chờ', total('commands', r => r.status === 'QUEUED')], ['Cần điều tra kết quả', total('commands', r => r.status === 'UNKNOWN')], ['Lỗi validation lịch sử', total('validation', r => r.result_status === 'FAIL')]].map(([label, count]) => <div className="metric" key={String(label)}><strong>{Number.isFinite(Number(count)) ? Number(count).toLocaleString('vi-VN') : count}</strong><span>{label}</span></div>)}</div><details><summary>Độ phủ các version theo domain và trạng thái</summary><Records rows={summary.data?.versions ?? []}/></details></QueryState></Panel>;
}
