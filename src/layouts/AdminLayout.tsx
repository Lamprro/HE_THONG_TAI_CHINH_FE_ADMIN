import { Activity, Bot, BriefcaseBusiness, Building2, Database, LayoutDashboard, Moon, Search, ServerCog, ShieldCheck, Sun, Workflow } from 'lucide-react';

export type Section = 'overview' | 'workflow' | 'history' | 'jobs' | 'scope' | 'quality' | 'ai' | 'data' | 'system';
export const sections: { id: Section; title: string; group: 'Giám sát' | 'Vận hành'; icon: typeof Activity }[] = [
  { id: 'overview', title: 'Tổng quan', group: 'Giám sát', icon: LayoutDashboard },
  { id: 'history', title: 'Tác vụ & lịch sử', group: 'Giám sát', icon: Activity },
  { id: 'data', title: 'Tra cứu dữ liệu', group: 'Giám sát', icon: Search },
  { id: 'system', title: 'Hệ thống', group: 'Giám sát', icon: ServerCog },
  { id: 'workflow', title: 'Luồng dữ liệu', group: 'Vận hành', icon: Workflow },
  { id: 'jobs', title: 'Job & nguồn', group: 'Vận hành', icon: BriefcaseBusiness },
  { id: 'scope', title: 'Danh mục mã', group: 'Vận hành', icon: Building2 },
  { id: 'quality', title: 'Chất lượng dữ liệu', group: 'Vận hành', icon: ShieldCheck },
  { id: 'ai', title: 'Vận hành AI', group: 'Vận hành', icon: Bot },
];

export function AdminLayout({ section, setSection, dark, setDark, children }: { section: Section; setSection: (section: Section) => void; dark: boolean; setDark: (value: boolean) => void; children: React.ReactNode }) {
  return <div className={`shell ${dark ? 'dark' : ''}`}>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">T<span>B</span></div><div><strong>TOKEN BURNER</strong><small>ADMIN CONSOLE</small></div></div>
      <nav aria-label="Main navigation">{(['Giám sát', 'Vận hành'] as const).map(group => <div key={group}>
        <div className="nav-label">{group.toUpperCase()}</div>
        {sections.filter(item => item.group === group).map(item => <button key={item.id} className={`nav-item ${section === item.id ? 'active' : ''}`} aria-current={section === item.id ? 'page' : undefined} onClick={() => setSection(item.id)}><item.icon size={17}/><span>{item.title}</span></button>)}
      </div>)}</nav>
      <div className="sidebar-bottom"><button className="theme-button" onClick={() => setDark(!dark)}>{dark ? <Sun size={16}/> : <Moon size={16}/>} {dark ? 'Giao diện sáng' : 'Giao diện tối'}</button><div className="sidebar-foot"><Database size={12}/> Java API · nguồn qua Python</div></div>
    </aside>
    <main className="main">{children}</main>
  </div>;
}
