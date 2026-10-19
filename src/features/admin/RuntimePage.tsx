import { useQuery } from '@tanstack/react-query';
import { API_BASE, getJson } from '../../shared/api/client';
import { Panel, QueryState } from '../../shared/components/Ui';
import { ApiResult } from './Records';

const cards = [
  ['runtime', 'Database & scheduler', '/api/admin/console/runtime'],
  ['python-health', 'Python · trạng thái thực qua adapter Java', '/api/external-financial-data/health'],
  ['providers', 'Nhà cung cấp · đăng ký và giới hạn', '/api/external-financial-data/providers'],
  ['capabilities', 'Python · hợp đồng dữ liệu đang triển khai', '/api/external-financial-data/capabilities'],
  ['coverage', 'Độ phủ và chất lượng dữ liệu tài chính', '/api/admin/financial-data/quality/coverage'],
  ['macro', 'Độ phủ kinh tế vĩ mô', '/api/admin/macro/coverage'],
];
function RuntimeCard({ id, title, path }: { id: string; title: string; path: string }) {
  const query = useQuery({ queryKey: ['runtime-card', id], queryFn: () => getJson(API_BASE, path), refetchInterval: id === 'runtime' ? 30000 : false });
  return <Panel title={title} action={<button className="text-button" onClick={() => query.refetch()}>Kiểm tra lại</button>}><QueryState query={query}><ApiResult value={query.data}/></QueryState></Panel>;
}
export function RuntimePage() {
  return <div className="admin-stack"><p>Java UP không chứng minh Python, nhà cung cấp hoặc scheduler đang hoạt động. Cờ enabled là cấu hình; khi chưa có heartbeat, màn hình không suy diễn lần chạy gần nhất.</p>{cards.map(([id, title, path]) => <RuntimeCard key={id} id={id} title={title} path={path}/>)}</div>;
}
