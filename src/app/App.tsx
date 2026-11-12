import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataScopePage } from '../features/data-scope/DataScopePage';
import { useScopeQueries } from '../features/data-scope/api';
import { RawPayloadDrawer } from '../features/ingestion/components/RawPayloadDrawer';
import { AdminLayout, sections, type Section } from '../layouts/AdminLayout';
import { useDashboardQueries, type DashboardSection } from '../features/dashboard/api/queries';
import type { ValidationResult } from '../features/dashboard/types/dto';
import { Overview } from '../features/dashboard/components/Overview';
import { JobsPage } from '../features/ingestion/components/JobsPage';
import { RunDrawer, RunsPanel } from '../features/ingestion/components/Runs';
import { DataQualityPage, ValidationDrawer } from '../features/data-quality/components/QualityPage';
import { SourcesPage } from '../features/data-sources/components/SourcesPage';
import { dateTime } from '../shared/utils/format';
import { OperationDrawer, type Operation } from '../features/operations/OperationDrawer';
import { SessionGate } from '../shared/api/SessionGate';
import { DataBrowser } from '../features/admin/DataBrowser';
import { NativeApiPage } from '../features/admin/NativeApiPage';
import { RuntimePage } from '../features/admin/RuntimePage';
import { WorkflowPage, type WorkflowSelection } from '../features/admin/WorkflowPage';
import { AiOperationsPage } from '../features/admin/AiOperationsPage';
import { OperationsHistory } from '../features/admin/OperationsHistory';
import { SchedulePanel } from '../features/admin/SchedulePanel';
import { SystemSummary } from '../features/admin/SystemSummary';

const descriptions: Record<Section, string> = {
  overview: 'Sức khỏe hệ thống, số liệu toàn database, lượt chạy và lỗi validation gần nhất.',
  workflow: 'Lấy nguồn qua Python → validation → build đúng version vào bảng cuối, hoặc tiếp tục từ nguồn đã lưu.',
  history: 'Tác vụ nền, lượt chạy nguồn, validation/version và audit; theo dõi hoặc xử lý tiếp từ bằng chứng đã lưu.',
  jobs: 'Định nghĩa job, lịch cron, chạy một lần và cấu hình nguồn dữ liệu.',
  scope: 'Công ty, mã chứng khoán, alias và việc cấp job theo mã.',
  quality: 'Kết quả validation, luật và phiên bản dữ liệu.',
  ai: 'Dự báo, phân tích tin, khôi phục và prompt — mọi lần chạy đều có audit.',
  data: 'Tra cứu toàn bộ bảng có phân trang, lọc chính xác theo nguồn gốc.',
  system: 'Java, database, Python, scheduler, độ phủ dữ liệu và danh mục API quản trị.',
};
type HistoryKind = 'commands' | 'runs' | 'all-runs' | 'quality' | 'audit';
const historyTabs: [HistoryKind, string][] = [['commands', 'Tác vụ nền'], ['runs', 'Lượt chạy gần đây'], ['all-runs', 'Toàn bộ lượt chạy'], ['quality', 'Validation & version'], ['audit', 'Audit quản trị']];
const writeNote = 'Mọi thao tác ghi đều có bước xem lại trước khi gửi.';

function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (value: T) => void; items: [T, string][] }) {
  return <div className="toolbar">{items.map(([id, title]) => <button key={id} className={value === id ? 'primary-button' : 'light-button'} onClick={() => onChange(id)}>{title}</button>)}</div>;
}

export function App() {
  return <SessionGate><Dashboard/></SessionGate>;
}
function Dashboard() {
  const [section, setSection] = useState<Section>('overview');
  const [workflow, setWorkflow] = useState<WorkflowSelection>({});
  const [historyKind, setHistoryKind] = useState<HistoryKind>('commands');
  const [jobsTab, setJobsTab] = useState<'jobs' | 'sources'>('jobs');
  const [systemTab, setSystemTab] = useState<'status' | 'api'>('status');
  const [dark, setDark] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [issue, setIssue] = useState<ValidationResult | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [jobLink, setJobLink] = useState<string | null>(null);
  const [sourceLink, setSourceLink] = useState<number | null>(null);
  const [rawId, setRawId] = useState<string | null>(null);
  const [qualityView, setQualityView] = useState<'validation' | 'versions'>('validation');
  const [qualityRaw, setQualityRaw] = useState<string | null>(null);
  const [qualityRun, setQualityRun] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const view: DashboardSection = section === 'overview' || section === 'jobs' || section === 'quality' ? section
    : section === 'history' && historyKind === 'runs' ? 'runs' : 'other';
  const scopeQueries = useScopeQueries(section === 'scope');
  const q = useDashboardQueries(view, true, !!runId || !!rawId);
  const { javaHealth: health, jobs, sources, runs, openIssues: issues, results, versions } = q;
  const activeQueries = section === 'scope' ? [health, scopeQueries.companies, scopeQueries.securities]
    : view === 'overview' ? [health, jobs, sources, runs, issues]
    : view === 'jobs' ? [health, jobs, sources]
    : view === 'runs' ? [health, runs, jobs, sources]
    : view === 'quality' ? [health, issues, results, versions, q.rules]
    : [health];
  const refreshing = activeQueries.some(query => query.isFetching);
  const latest = (() => {
    const timestamp = activeQueries.map(query => query.dataUpdatedAt).filter(Boolean).sort((a, b) => b - a)[0];
    return timestamp ? new Date(timestamp).toISOString() : undefined;
  })();
  const connection = health.isPending ? 'Đang kiểm tra' : health.isError || health.data?.data.status !== 'UP' ? 'Mất kết nối' : 'Đã kết nối';
  const current = sections.find(item => item.id === section)!;
  const openJobs = (id?: string) => { setJobLink(id ?? null); setJobsTab('jobs'); setSection('jobs'); };
  const openSources = (id?: number) => { setSourceLink(id ?? null); setJobsTab('sources'); setSection('jobs'); };
  const openQuality = (run: string | null, raw: string | null, tab: 'validation' | 'versions') => { setQualityRun(run); setQualityRaw(raw); setQualityView(tab); setSection('quality'); };
  const openWorkflow = (selection: WorkflowSelection) => { setWorkflow(selection); setSection('workflow'); };

  return <AdminLayout section={section} setSection={setSection} dark={dark} setDark={setDark}>
    <div className="topline">
      <div className="breadcrumb">{current.group} <span>/</span> {current.title}</div>
      <span className="read-only">ADMIN OPERATIONS</span>
    </div>
    <div className="content">
      <header className="page-header">
        <div>
          <div className="eyebrow">TOKEN BURNER / ADMIN CONSOLE</div>
          <h1>{current.title}</h1>
          <p>{descriptions[section]}</p>
          <p className="last-updated">Cập nhật lúc {dateTime(latest)}</p>
        </div>
        <div className="header-actions">
          <button className="primary-button" disabled={refreshing} onClick={() => queryClient.invalidateQueries({ type: 'active' })}>
            <RefreshCw size={15}/>{refreshing ? 'Đang tải…' : 'Tải lại'}
          </button>
        </div>
      </header>
      <div className="connection-strip"><div><span className={`signal ${connection === 'Đã kết nối' ? 'online' : connection === 'Đang kiểm tra' ? '' : 'offline'}`}/><b>Java Backend</b><span>{connection}</span></div></div>

      {section === 'overview' && <>
        <SystemSummary/>
        <Overview health={health} jobs={jobs} sources={sources} runs={runs} issues={issues} onRun={setRunId} onIssue={setIssue} onRuns={() => { setHistoryKind('runs'); setSection('history'); }} onQuality={() => setSection('quality')}/>
      </>}

      {section === 'workflow' && <WorkflowPage key={JSON.stringify(workflow)} initial={workflow} onRun={setRunId}/>}

      {section === 'history' && <>
        <Tabs value={historyKind} onChange={setHistoryKind} items={historyTabs}/>
        {historyKind === 'runs' ? <>
          <div className="management-toolbar">
            <div className="header-actions"><button className="light-button" onClick={() => setOperation({ kind: 'manual-ingestion' })}>New Manual Ingestion</button></div>
            <span className="subtle">20 lượt gần nhất; mở “Toàn bộ lượt chạy” để phân trang toàn bộ lịch sử.</span>
          </div>
          <RunsPanel runs={runs} jobs={jobs.data} sources={sources.data} onSelect={setRunId}/>
        </> : <OperationsHistory key={historyKind} kind={historyKind === 'all-runs' ? 'runs' : historyKind} onRun={setRunId} onWorkflow={openWorkflow}/>}
      </>}

      {section === 'jobs' && <>
        <Tabs value={jobsTab} onChange={setJobsTab} items={[['jobs', 'Ingestion Jobs'], ['sources', 'Data Sources']]}/>
        <div className="management-toolbar">
          <div className="header-actions">
            {jobsTab === 'jobs'
              ? <><button className="primary-button" onClick={() => setOperation({ kind: 'create-job' })}>Create Job</button><button className="light-button" onClick={() => setOperation({ kind: 'manual-ingestion' })}>New Manual Ingestion</button></>
              : <button className="primary-button" onClick={() => setOperation({ kind: 'upsert-source' })}>Add Data Source</button>}
          </div>
          <span className="subtle">{writeNote}</span>
        </div>
        {jobsTab === 'jobs'
          ? <JobsPage onSource={openSources} jobs={jobs} sources={sources.data} runs={runs.data} onRun={setRunId} onOperation={setOperation} linkedId={jobLink}/>
          : <SourcesPage onJob={openJobs} sources={sources} jobs={jobs.data} runs={runs.data} onRun={setRunId} onOperation={setOperation} linkedId={sourceLink}/>}
      </>}

      {section === 'scope' && <DataScopePage companies={scopeQueries.companies} securities={scopeQueries.securities}/>}

      {section === 'quality' && <>
        <div className="management-toolbar">
          <div className="header-actions"><button className="light-button" onClick={() => setOperation({ kind: 'validate-pending' })}>Validate Pending Data</button></div>
          <span className="subtle">{writeNote}</span>
        </div>
        <DataQualityPage key={`${qualityRun}-${qualityRaw}-${qualityView}`} initialTab={qualityView} rawFilter={qualityRaw} onRaw={setRawId} openIssues={issues} results={results} versions={versions} rules={q.rules} enabled onSelect={setIssue} onRun={setRunId} runFilter={qualityRun} clearRunFilter={() => { setQualityRun(null); setQualityRaw(null); }}/>
      </>}

      {section === 'ai' && <AiOperationsPage onRun={setRunId}/>}
      {section === 'data' && <DataBrowser onRun={setRunId} onRaw={setRawId}/>}

      {section === 'system' && <>
        <Tabs value={systemTab} onChange={setSystemTab} items={[['status', 'Trạng thái & độ phủ'], ['api', 'API quản trị nâng cao']]}/>
        {systemTab === 'status' ? <><RuntimePage/><SchedulePanel/></> : <NativeApiPage/>}
      </>}
    </div>
    <RunDrawer onRaw={id => { setRunId(null); setRawId(id); }} onIssue={value => { setRunId(null); setIssue(value); }} id={runId} onClose={() => setRunId(null)} validation={results.data} enabled onOperation={setOperation} onJob={id => { setRunId(null); openJobs(id); }} onSource={id => { setRunId(null); openSources(id); }} onQuality={id => { setRunId(null); openQuality(id, null, 'validation'); }}/>
    <ValidationDrawer onRaw={id => { setIssue(null); setRawId(id); }} issue={issue} onClose={() => setIssue(null)} onRun={setRunId}/>
    <RawPayloadDrawer id={rawId} onClose={() => setRawId(null)} validation={results} versions={versions} onRun={id => { setRawId(null); setRunId(id); }} onIssue={value => { setRawId(null); setIssue(value); }} onOperation={value => { setRawId(null); setOperation(value); }} onQuality={(payloadId, ingestionRunId) => { setRawId(null); openQuality(ingestionRunId, payloadId, 'validation'); }} onVersions={id => { setRawId(null); openQuality(id, null, 'versions'); }}/>
    {operation && <OperationDrawer operation={operation} sources={sources.data} onClose={() => setOperation(null)} onRun={setRunId}/>}
  </AdminLayout>;
}
