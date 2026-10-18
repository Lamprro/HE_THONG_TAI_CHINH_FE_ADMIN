import { Activity, BriefcaseBusiness, Database, LayoutDashboard, Moon, ServerCog, Sun } from 'lucide-react';
export type Section = 'overview' | 'jobs' | 'runs' | 'quality' | 'sources' | 'scope';
const items: { id: Section; title: string; icon: typeof Activity }[] = [
  { id: 'overview', title: 'Overview', icon: LayoutDashboard },
  { id: 'jobs', title: 'Ingestion Jobs', icon: BriefcaseBusiness },
  { id: 'runs', title: 'Ingestion Runs', icon: Activity },
  { id: 'quality', title: 'Data Quality', icon: Database },
  { id: 'sources', title: 'Data Sources', icon: ServerCog },
  { id: 'scope', title: 'Data Scope', icon: BriefcaseBusiness },
];
export function AdminLayout({ section, setSection, dark, setDark, children }: { section: Section; setSection: (section: Section) => void; dark: boolean; setDark: (value: boolean) => void; children: React.ReactNode }) {
  return <div className={`shell ${dark ? 'dark' : ''}`}>
    <aside className="sidebar"><div className="brand"><div className="brand-mark">T<span>B</span></div><div><strong>TOKEN BURNER</strong><small>ADMIN CONSOLE</small></div></div><nav aria-label="Main navigation">{(["MONITORING", "MANAGEMENT"] as const).map(group => <div key={group}><div className="nav-label">{group}</div>{items.filter(item => group === "MONITORING" ? ["overview", "runs"].includes(item.id) : ["jobs", "sources", "scope", "quality"].includes(item.id)).map(item => <button key={item.id} className={`nav-item ${section === item.id ? 'active' : ''}`} aria-current={section === item.id ? 'page' : undefined} onClick={() => setSection(item.id)}><item.icon size={17}/><span>{item.title}</span></button>)}</div>)}</nav><div className="sidebar-bottom"><button className="theme-button" onClick={() => setDark(!dark)}>{dark ? <Sun size={16}/> : <Moon size={16}/>} {dark ? 'Light mode' : 'Dark mode'}</button><div className="sidebar-foot">MONITORING & MANAGEMENT<br/>Java API connection</div></div></aside>
    <main className="main">{children}</main>
  </div>;
}
