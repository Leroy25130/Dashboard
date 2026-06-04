import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import SectionHeader from './SectionHeader';
import MultiSelect from './MultiSelect';

const th = { padding: '8px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
const td = { padding: '7px 12px', color: '#e2e8f0', borderBottom: '1px solid #1e293b' };
const TOOLTIP_STYLE = { background: '#0f172a', border: '1px solid #334155', borderRadius: 8 };

const OPEN_STATUSES = new Set(['OPEN', 'PENDING APPROVAL', 'INCOMPLETE']);

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

const STATUS_COLORS = {
  'OPEN': '#3b82f6',
  'CLOSED': '#10b981',
  'CANCELED': '#ef4444',
  'CLOSED FOR RECEIVING': '#06b6d4',
  'CLOSED FOR INVOICING': '#8b5cf6',
  'PENDING APPROVAL': '#f59e0b',
  'INCOMPLETE': '#f97316',
  'WITHDRAWN': '#64748b',
};

function fmtNum(n, decimals = 0) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCurrency(n, currency) {
  const symbols = { USD: '$', EUR: '€', CHF: 'CHF ', GBP: '£', SEK: 'SEK ' };
  const sym = symbols[currency] || (currency + ' ');
  return sym + fmtNum(n, 0);
}

function monthKeyFromDate(s) {
  if (!s) return null;
  const d = parseDate(s);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabelFromKey(k) {
  if (!k) return '';
  const [y, m] = k.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function Pill({ label, value, color, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? color + '22' : '#1e293b',
        borderRadius: 8,
        padding: '8px 16px',
        borderLeft: `3px solid ${color || '#475569'}`,
        cursor: onClick ? 'pointer' : 'default',
        outline: active ? `1px solid ${color}` : 'none',
        minWidth: 120,
      }}
    >
      <div style={{ color: '#94a3b8', fontSize: 12 }}>{label}</div>
      <div style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

// ── Section 1: PO Status Overview ────────────────────────────────────────────
function POStatusSection({ data }) {
  const allSuppliers = useMemo(() => [...new Set(data.map(r => r['Supplier Name']).filter(Boolean))].sort(), [data]);
  const allBuyers    = useMemo(() => [...new Set(data.map(r => r['Buyer Name']).filter(Boolean))].sort(), [data]);

  const [selSuppliers, setSelSuppliers] = useState(new Set());
  const [selBuyers,    setSelBuyers]    = useState(new Set());
  const [activeStatus, setActiveStatus] = useState(null);

  const filtered = useMemo(() => data.filter(r => {
    if (selSuppliers.size && !selSuppliers.has(r['Supplier Name'])) return false;
    if (selBuyers.size    && !selBuyers.has(r['Buyer Name']))       return false;
    return true;
  }), [data, selSuppliers, selBuyers]);

  const statusCounts = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const s = r['Order Status'] || 'Unknown';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const tableRows = useMemo(() => {
    if (!activeStatus) return filtered;
    return filtered.filter(r => r['Order Status'] === activeStatus);
  }, [filtered, activeStatus]);

  const chartData = statusCounts.map(([s, c]) => ({ status: s, count: c, color: STATUS_COLORS[s] || '#94a3b8' }));

  return (
    <div id="po-status">
      <SectionHeader title="PO Status Overview" icon="📋" />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <MultiSelect options={allSuppliers} selected={selSuppliers} onChange={setSelSuppliers} label="Supplier" minWidth={200} />
        <MultiSelect options={allBuyers}    selected={selBuyers}    onChange={setSelBuyers}    label="Buyer"    minWidth={180} />
        {(selSuppliers.size > 0 || selBuyers.size > 0) && (
          <button onClick={() => { setSelSuppliers(new Set()); setSelBuyers(new Set()); }}
            style={{ background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Status pills */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {statusCounts.map(([s, c]) => (
          <Pill key={s} label={s} value={c}
            color={STATUS_COLORS[s] || '#94a3b8'}
            active={activeStatus === s}
            onClick={() => setActiveStatus(prev => prev === s ? null : s)}
          />
        ))}
      </div>

      {/* Bar chart */}
      <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>PO Lines by Status</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="status" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#334155' }} />
            <Bar dataKey="count" name="Lines" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div style={{ background: '#1e293b', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13, borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{tableRows.length} lines{activeStatus ? ` — ${activeStatus}` : ''}</span>
          {activeStatus && (
            <button onClick={() => setActiveStatus(null)}
              style={{ background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>
              Clear filter
            </button>
          )}
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 }}>
              <tr>
                <th style={th}>Document #</th>
                <th style={th}>Line #</th>
                <th style={th}>Supplier</th>
                <th style={th}>Item Description</th>
                <th style={{ ...th, textAlign: 'right' }}>Ordered Qty</th>
                <th style={{ ...th, textAlign: 'right' }}>Received Qty</th>
                <th style={{ ...th, textAlign: 'right' }}>Open Qty</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(0, 200).map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#162032' }}>
                  <td style={td}>{r['Document Number']}</td>
                  <td style={td}>{r['Line Number']}</td>
                  <td style={td}>{r['Supplier Name']}</td>
                  <td style={{ ...td, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r['Item Description']}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtNum(r['Ordered Quantity'])}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtNum(r['Received Quantity'])}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtNum(r['Open Quantity'])}</td>
                  <td style={td}>
                    <span style={{ background: (STATUS_COLORS[r['Order Status']] || '#94a3b8') + '22', color: STATUS_COLORS[r['Order Status']] || '#94a3b8', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>
                      {r['Order Status']}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tableRows.length > 200 && (
            <div style={{ padding: '10px 16px', color: '#64748b', fontSize: 12 }}>Showing 200 of {tableRows.length} rows</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section 2: Late Deliveries ────────────────────────────────────────────────
function LateDeliveriesSection({ data }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allSuppliers = useMemo(() => [...new Set(data.map(r => r['Supplier Name']).filter(Boolean))].sort(), [data]);
  const [selSuppliers, setSelSuppliers] = useState(new Set());

  const openLines = useMemo(() => data.filter(r => OPEN_STATUSES.has(r['Order Status'])), [data]);

  const lateLines = useMemo(() => openLines.filter(r => {
    const d = parseDate(r['Promised Delivery Date']);
    return d && d < today;
  }), [openLines]);

  const onTimeLines = useMemo(() => openLines.filter(r => {
    const d = parseDate(r['Promised Delivery Date']);
    return d && d >= today;
  }), [openLines]);

  const filteredLate = useMemo(() => lateLines.filter(r =>
    selSuppliers.size === 0 || selSuppliers.has(r['Supplier Name'])
  ), [lateLines, selSuppliers]);

  const chartData = useMemo(() => {
    const map = {};
    lateLines.forEach(r => {
      const s = r['Supplier Name'] || 'Unknown';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([s, c]) => ({ supplier: s.length > 22 ? s.slice(0, 22) + '…' : s, fullName: s, count: c }));
  }, [lateLines]);

  const tableRows = useMemo(() => {
    return [...filteredLate]
      .map(r => {
        const d = parseDate(r['Promised Delivery Date']);
        const delay = d ? Math.round((today - d) / 86400000) : null;
        return { ...r, _delay: delay };
      })
      .sort((a, b) => (b._delay || 0) - (a._delay || 0));
  }, [filteredLate]);

  return (
    <div id="po-late">
      <SectionHeader title="Late Deliveries" icon="⏰" />

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <Pill label="Open Lines"   value={openLines.length}  color="#3b82f6" />
        <Pill label="Late Lines"   value={lateLines.length}  color="#ef4444" />
        <Pill label="On-Time Lines" value={onTimeLines.length} color="#10b981" />
      </div>

      {/* Bar chart: top 10 suppliers with most late lines */}
      <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>Top 10 Suppliers — Late Lines</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="supplier" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#334155' }}
              formatter={(v, n, p) => [v, 'Late Lines']}
              labelFormatter={(l, payload) => payload?.[0]?.payload?.fullName || l}
            />
            <Bar dataKey="count" name="Late Lines" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <MultiSelect options={allSuppliers} selected={selSuppliers} onChange={setSelSuppliers} label="Supplier" minWidth={200} />
        {selSuppliers.size > 0 && (
          <button onClick={() => setSelSuppliers(new Set())}
            style={{ background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#1e293b', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13, borderBottom: '1px solid #334155' }}>
          {tableRows.length} late lines (sorted by delay)
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 }}>
              <tr>
                <th style={th}>Document #</th>
                <th style={th}>Line #</th>
                <th style={th}>Supplier</th>
                <th style={th}>Item Description</th>
                <th style={th}>Promised Date</th>
                <th style={th}>Requested Date</th>
                <th style={{ ...th, textAlign: 'right' }}>Open Qty</th>
                <th style={{ ...th, textAlign: 'right' }}>Delay (days)</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(0, 200).map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#162032' }}>
                  <td style={td}>{r['Document Number']}</td>
                  <td style={td}>{r['Line Number']}</td>
                  <td style={td}>{r['Supplier Name']}</td>
                  <td style={{ ...td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r['Item Description']}</td>
                  <td style={td}>{r['Promised Delivery Date']}</td>
                  <td style={td}>{r['Requested Delivery Date']}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtNum(r['Open Quantity'])}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>{r._delay != null ? r._delay : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tableRows.length > 200 && (
            <div style={{ padding: '10px 16px', color: '#64748b', fontSize: 12 }}>Showing 200 of {tableRows.length} rows</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section 3: Financial Exposure ─────────────────────────────────────────────
function FinancialSection({ data }) {
  const allSuppliers = useMemo(() => [...new Set(data.map(r => r['Supplier Name']).filter(Boolean))].sort(), [data]);
  const allCurrencies = useMemo(() => [...new Set(data.map(r => r['Currency Code']).filter(Boolean))].sort(), [data]);

  const [selSuppliers,  setSelSuppliers]  = useState(new Set());
  const [selCurrencies, setSelCurrencies] = useState(new Set());

  const openLines = useMemo(() => data.filter(r => OPEN_STATUSES.has(r['Order Status'])), [data]);

  const filtered = useMemo(() => openLines.filter(r => {
    if (selSuppliers.size  && !selSuppliers.has(r['Supplier Name']))  return false;
    if (selCurrencies.size && !selCurrencies.has(r['Currency Code'])) return false;
    return true;
  }), [openLines, selSuppliers, selCurrencies]);

  // Currency breakdown of ALL open lines
  const currencyBreakdown = useMemo(() => {
    const map = {};
    openLines.forEach(r => {
      const c = r['Currency Code'] || 'Unknown';
      map[c] = (map[c] || 0) + (Number(r['Extended Price']) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [openLines]);

  const totalOpenValue = useMemo(() => filtered.reduce((s, r) => s + (Number(r['Extended Price']) || 0), 0), [filtered]);

  // Top 15 suppliers by open value
  const supplierChart = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const s = r['Supplier Name'] || 'Unknown';
      map[s] = (map[s] || 0) + (Number(r['Extended Price']) || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([s, v]) => ({ supplier: s.length > 22 ? s.slice(0, 22) + '…' : s, fullName: s, value: Math.round(v) }));
  }, [filtered]);

  // Monthly open value
  const monthlyChart = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const k = monthKeyFromDate(r['PO Creation Date ']);
      if (!k) return;
      map[k] = (map[k] || 0) + (Number(r['Extended Price']) || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ month: monthLabelFromKey(k), value: Math.round(v) }));
  }, [filtered]);

  const tableRows = useMemo(() =>
    [...filtered].sort((a, b) => (Number(b['Extended Price']) || 0) - (Number(a['Extended Price']) || 0)),
    [filtered]);

  return (
    <div id="po-financial">
      <SectionHeader title="Financial Exposure" icon="💰" />

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <Pill label="Open Lines"      value={openLines.length}    color="#3b82f6" />
        {currencyBreakdown.map(([c, v]) => (
          <Pill key={c} label={`Open Value (${c})`} value={fmtCurrency(v, c)} color="#8b5cf6" />
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div style={{ background: '#1e293b', borderRadius: 10, padding: 20 }}>
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>Top 15 Suppliers by Open Value</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={supplierChart} margin={{ top: 4, right: 16, left: 16, bottom: 90 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="supplier" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#334155' }}
                formatter={(v) => [fmtNum(v, 0), 'Open Value']}
                labelFormatter={(l, payload) => payload?.[0]?.payload?.fullName || l}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: '#1e293b', borderRadius: 10, padding: 20 }}>
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>Open Value by PO Creation Month</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyChart} margin={{ top: 4, right: 16, left: 16, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#334155' }} formatter={(v) => [fmtNum(v, 0), 'Open Value']} />
              <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <MultiSelect options={allSuppliers}  selected={selSuppliers}  onChange={setSelSuppliers}  label="Supplier" minWidth={200} />
        <MultiSelect options={allCurrencies} selected={selCurrencies} onChange={setSelCurrencies} label="Currency" minWidth={120} />
        {(selSuppliers.size > 0 || selCurrencies.size > 0) && (
          <button onClick={() => { setSelSuppliers(new Set()); setSelCurrencies(new Set()); }}
            style={{ background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#1e293b', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13, borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between' }}>
          <span>{tableRows.length} open lines</span>
          <span style={{ color: '#8b5cf6', fontWeight: 600 }}>Total: {fmtNum(totalOpenValue, 0)}</span>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 }}>
              <tr>
                <th style={th}>Document #</th>
                <th style={th}>Supplier</th>
                <th style={th}>Item Description</th>
                <th style={{ ...th, textAlign: 'right' }}>Ordered Qty</th>
                <th style={{ ...th, textAlign: 'right' }}>Open Qty</th>
                <th style={{ ...th, textAlign: 'right' }}>Unit Price</th>
                <th style={{ ...th, textAlign: 'right' }}>Extended Price</th>
                <th style={th}>Currency</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(0, 200).map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#162032' }}>
                  <td style={td}>{r['Document Number']}</td>
                  <td style={td}>{r['Supplier Name']}</td>
                  <td style={{ ...td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r['Item Description']}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtNum(r['Ordered Quantity'])}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtNum(r['Open Quantity'])}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtNum(Number(r['Unit Price']), 2)}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: '#8b5cf6' }}>{fmtNum(Number(r['Extended Price']), 0)}</td>
                  <td style={td}>{r['Currency Code']}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tableRows.length > 200 && (
            <div style={{ padding: '10px 16px', color: '#64748b', fontSize: 12 }}>Showing 200 of {tableRows.length} rows</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section 4: Supplier Breakdown ─────────────────────────────────────────────
function SupplierBreakdownSection({ data }) {
  const allStatuses = useMemo(() => [...new Set(data.map(r => r['Order Status']).filter(Boolean))].sort(), [data]);
  const allBuyers   = useMemo(() => [...new Set(data.map(r => r['Buyer Name']).filter(Boolean))].sort(), [data]);

  const [selStatuses, setSelStatuses] = useState(new Set());
  const [selBuyers,   setSelBuyers]   = useState(new Set());

  const filtered = useMemo(() => data.filter(r => {
    if (selStatuses.size && !selStatuses.has(r['Order Status'])) return false;
    if (selBuyers.size   && !selBuyers.has(r['Buyer Name']))     return false;
    return true;
  }), [data, selStatuses, selBuyers]);

  const totalValue = useMemo(() => data.reduce((s, r) => s + (Number(r['Extended Price']) || 0), 0), [data]);
  const uniqueSuppliers = useMemo(() => new Set(data.map(r => r['Supplier Name']).filter(Boolean)).size, [data]);

  // Per-supplier stats from filtered
  const supplierRows = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const s = r['Supplier Name'] || 'Unknown';
      if (!map[s]) map[s] = { name: s, total: 0, open: 0, closed: 0, totalVal: 0, openVal: 0 };
      map[s].total++;
      map[s].totalVal += Number(r['Extended Price']) || 0;
      if (OPEN_STATUSES.has(r['Order Status'])) {
        map[s].open++;
        map[s].openVal += Number(r['Extended Price']) || 0;
      } else {
        map[s].closed++;
      }
    });
    return Object.values(map).sort((a, b) => b.totalVal - a.totalVal);
  }, [filtered]);

  // Chart: top 15 suppliers by TOTAL Extended Price (all data, not filtered)
  const chartData = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const s = r['Supplier Name'] || 'Unknown';
      map[s] = (map[s] || 0) + (Number(r['Extended Price']) || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([s, v]) => ({ supplier: s.length > 22 ? s.slice(0, 22) + '…' : s, fullName: s, value: Math.round(v) }));
  }, [data]);

  return (
    <div id="po-supplier">
      <SectionHeader title="Supplier Breakdown" icon="🏭" />

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <Pill label="Total Suppliers" value={uniqueSuppliers} color="#f59e0b" />
        <Pill label="Total PO Lines"  value={data.length}     color="#3b82f6" />
        <Pill label="Total Value"     value={fmtNum(totalValue, 0)} color="#10b981" />
      </div>

      {/* Bar chart: top 15 by total value */}
      <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>Top 15 Suppliers by Total Extended Price</div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 16, bottom: 90 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="supplier" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#334155' }}
              formatter={(v) => [fmtNum(v, 0), 'Total Value']}
              labelFormatter={(l, payload) => payload?.[0]?.payload?.fullName || l}
            />
            <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <MultiSelect options={allStatuses} selected={selStatuses} onChange={setSelStatuses} label="Order Status" minWidth={180} />
        <MultiSelect options={allBuyers}   selected={selBuyers}   onChange={setSelBuyers}   label="Buyer"        minWidth={180} />
        {(selStatuses.size > 0 || selBuyers.size > 0) && (
          <button onClick={() => { setSelStatuses(new Set()); setSelBuyers(new Set()); }}
            style={{ background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Table: one row per supplier */}
      <div style={{ background: '#1e293b', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13, borderBottom: '1px solid #334155' }}>
          {supplierRows.length} suppliers
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 }}>
              <tr>
                <th style={th}>Supplier Name</th>
                <th style={{ ...th, textAlign: 'right' }}>Total Lines</th>
                <th style={{ ...th, textAlign: 'right' }}>Open Lines</th>
                <th style={{ ...th, textAlign: 'right' }}>Closed Lines</th>
                <th style={{ ...th, textAlign: 'right' }}>Total Value</th>
                <th style={{ ...th, textAlign: 'right' }}>Open Value</th>
                <th style={{ ...th, textAlign: 'right' }}>% Open</th>
              </tr>
            </thead>
            <tbody>
              {supplierRows.map((r, i) => {
                const pctOpen = r.total > 0 ? ((r.open / r.total) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#162032' }}>
                    <td style={td}>{r.name}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{r.total}</td>
                    <td style={{ ...td, textAlign: 'right', color: r.open > 0 ? '#3b82f6' : '#e2e8f0' }}>{r.open}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{r.closed}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmtNum(r.totalVal, 0)}</td>
                    <td style={{ ...td, textAlign: 'right', color: r.openVal > 0 ? '#8b5cf6' : '#e2e8f0' }}>{fmtNum(r.openVal, 0)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <span style={{ color: Number(pctOpen) > 50 ? '#f59e0b' : '#94a3b8' }}>{pctOpen}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main Purchasing component ─────────────────────────────────────────────────
export default function Purchasing({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 40, color: '#64748b', fontSize: 15 }}>
        No purchasing data available. Upload a Purchase Order Report via "Update Data".
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#f1f5f9' }}>Purchasing KPIs</h1>
        <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{data.length} PO lines</div>
      </div>

      <POStatusSection       data={data} />
      <LateDeliveriesSection data={data} />
      <FinancialSection      data={data} />
      <SupplierBreakdownSection data={data} />

      <div style={{ height: 60 }} />
    </div>
  );
}
