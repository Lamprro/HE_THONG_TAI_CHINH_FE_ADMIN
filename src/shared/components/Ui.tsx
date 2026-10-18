import { useEffect, useRef, type ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Panel({ title, eyebrow, note, action, children, className = '' }: { title: string; eyebrow?: string; note?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><div className="panel-head"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2>{note && <p className="subtle">{note}</p>}</div>{action}</div>{children}</section>;
}

export function QueryState({ query, empty = 'No records found.', children }: { query: UseQueryResult<unknown>; empty?: string; children: ReactNode }) {
  if (query.isPending) return <div className="skeleton-stack" aria-label="Loading"><div/><div/><div/></div>;
  if (query.isError && !query.data) return <div className="state-error" role="alert"><strong>Unable to load data</strong><span>{query.error.message}</span><button className="light-button" onClick={() => query.refetch()}>Retry</button></div>;
  if (Array.isArray(query.data) && query.data.length === 0) return <div className="state-empty">{empty}</div>;
  return <>{query.isFetching && <div className="refresh-note" role="status">Refreshing… showing the last loaded data</div>}{children}</>;
}

export function Drawer({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key === 'Tab' && dialog.current) {
        const focusables = Array.from(dialog.current.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled'));
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus(); };
  }, []);
  return <div className="drawer-backdrop" onMouseDown={onClose}><aside ref={dialog} tabIndex={-1} className="drawer" role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()}><div className="drawer-head"><div><div className="eyebrow">TOKEN BURNER / DETAIL</div><h2>{title}</h2>{subtitle && <p className="subtle">{subtitle}</p>}</div><button className="icon-button" aria-label="Close" onClick={onClose}>✕</button></div><div className="drawer-body">{children}</div></aside></div>;
}
