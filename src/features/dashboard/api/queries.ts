import { useQuery } from '@tanstack/react-query';
import { getHealth, getJson, API_BASE } from '../../../shared/api/client';
import type { JavaHealth, DataSource, IngestionJob, IngestionRun, RawPayload, ValidationResult, DataVersion } from '../types/dto';
import type { ValidationRule } from '../../operations/contracts';
export type DashboardSection = 'overview' | 'jobs' | 'runs' | 'quality' | 'sources' | 'scope' | 'console' | 'data' | 'native' | 'runtime';
export function useDashboardQueries(section: DashboardSection, enabled = true, runOpen = false) {
  const javaHealth = useQuery({ queryKey: ['java-health'], queryFn: () => getHealth<JavaHealth>(API_BASE, '/api/health'), enabled, refetchInterval: 45000 });
  const jobs = useQuery({ queryKey: ['jobs'], queryFn: () => getJson<IngestionJob[]>(API_BASE, '/api/ingestion-jobs?activeOnly=false'), enabled: enabled && ['overview', 'jobs', 'runs', 'console', 'sources'].includes(section), staleTime: 5 * 60000, refetchInterval: 5 * 60000 });
  const sources = useQuery({ queryKey: ['sources'], queryFn: () => getJson<DataSource[]>(API_BASE, '/api/data-sources'), enabled: enabled && ['overview', 'jobs', 'runs', 'sources'].includes(section), staleTime: 5 * 60000, refetchInterval: 5 * 60000 });
  const runs = useQuery({ queryKey: ['runs'], queryFn: () => getJson<IngestionRun[]>(API_BASE, '/api/ingestions?limit=20'), enabled: enabled && ['overview', 'runs'].includes(section), refetchInterval: 45000 });
  const openIssues = useQuery({ queryKey: ['open-issues'], queryFn: () => getJson<ValidationResult[]>(API_BASE, '/api/admin/validation/results/open?limit=50'), enabled: enabled && ['overview', 'quality'].includes(section), refetchInterval: 90000 });
  const results = useQuery({ queryKey: ['results'], queryFn: () => getJson<ValidationResult[]>(API_BASE, '/api/admin/validation/results?limit=50'), enabled: enabled && (section === 'quality' || runOpen), refetchInterval: section === 'quality' ? 120000 : false });
  const versions = useQuery({ queryKey: ['versions'], queryFn: () => getJson<DataVersion[]>(API_BASE, '/api/admin/validation/data-versions?limit=50'), enabled: enabled && (section === 'quality' || runOpen), staleTime: 2 * 60000, refetchInterval: 3 * 60000 });
  const rules = useQuery({ queryKey: ['rules'], queryFn: () => getJson<ValidationRule[]>(API_BASE, '/api/admin/validation/rules'), enabled: enabled && section === 'quality', staleTime: 5 * 60000 });
  return { javaHealth, jobs, sources, runs, openIssues, results, versions, rules };
}
export function useRunDetail(id: string | null, enabled = true) {
  const run = useQuery({ queryKey: ['run', id], queryFn: () => getJson<IngestionRun>(API_BASE, `/api/ingestions/${encodeURIComponent(id!)}`), enabled: enabled && !!id });
  const payloads = useQuery({ queryKey: ['payloads', id], queryFn: () => getJson<RawPayload[]>(API_BASE, `/api/raw-payloads?runId=${encodeURIComponent(id!)}&includeBody=false`), enabled: enabled && !!id });
  return { run, payloads };
}
