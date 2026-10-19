import { useState } from 'react';
import { Drawer } from '../../shared/components/Ui';
import { dateTime, safeObject, safeText } from '../../shared/utils/format';

export type Row = Record<string, unknown>;
const preferred = ['symbol', 'source_symbol', 'title', 'name', 'code', 'operation', 'provider', 'action', 'status', 'result_status', 'handling_status', 'rule_code', 'message', 'metric_code', 'period_end', 'trading_date', 'observation_date', 'close_price', 'value', 'statement_type', 'data_domain', 'source_code', 'created_at', 'checked_at'];
function text(key: string, value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return Array.isArray(value) ? `${value.length} mục` : 'Chi tiết';
  if (key.endsWith('_at') && typeof value === 'string') return dateTime(value);
  return safeText(String(value));
}
export function RecordDetail({ row }: { row: Row }) {
  return <dl className="record-detail">{Object.entries(row).map(([key, value]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{value && typeof value === 'object' ? <details><summary>Xem nội dung</summary><pre>{safeObject(value)}</pre></details> : <span className="break">{text(key, value)}</span>}</dd></div>)}</dl>;
}
export function Records({ rows, onRun, onRaw }: { rows: Row[]; onRun?: (id: string) => void; onRaw?: (id: string) => void }) {
  const [selected, setSelected] = useState<Row | null>(null);
  rows = rows.map(row => {
    const request = row.request_query_params;
    if (request && typeof request === 'object' && !Array.isArray(request)) {
      const source = request as Row;
      return { ...row, ...(source.symbol ? { symbol: source.symbol } : {}), ...(source.operation ? { operation: source.operation } : {}), ...(source.provider ? { provider: source.provider } : {}) };
    }
    return row;
  });
  const keys = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const columns = [...preferred.filter(k => keys.includes(k)), ...keys.filter(k => !preferred.includes(k) && !k.endsWith('_json') && !k.endsWith('_id') && k !== 'id')].slice(0, 6);
  return <>{rows.length ? <div className="table-scroll"><table><thead><tr>{columns.map(c => <th key={c}>{c.replaceAll('_', ' ')}</th>)}<th>Thao tác</th></tr></thead><tbody>{rows.map((row, n) => <tr key={String(row.id ?? n)}>{columns.map(c => <td className="record-cell" key={c} title={text(c, row[c])}>{text(c, row[c])}</td>)}<td><button className="text-button" onClick={() => setSelected(row)}>Chi tiết</button>{typeof row.ingestion_run_id === 'string' && onRun && <button className="text-button" onClick={() => onRun(row.ingestion_run_id as string)}>Lượt chạy</button>}{typeof row.raw_payload_id === 'string' && onRaw && <button className="text-button" onClick={() => onRaw(row.raw_payload_id as string)}>Nguồn gốc</button>}</td></tr>)}</tbody></table></div> : <p className="state-empty">Không có bản ghi phù hợp.</p>}
    {selected && <Drawer title="Chi tiết bản ghi" subtitle={String(selected.id ?? '')} onClose={() => setSelected(null)}><RecordDetail row={selected}/></Drawer>}
  </>;
}
export function ApiResult({ value }: { value: unknown }) {
  if (Array.isArray(value) && value.every(v => v && typeof v === 'object' && !Array.isArray(v))) return <Records rows={value as Row[]}/>;
  if (value && typeof value === 'object' && !Array.isArray(value)) return <RecordDetail row={value as Row}/>;
  return <pre>{safeObject(value)}</pre>;
}
