import { useMemo, useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import SectionHeader from './SectionHeader';
import MultiSelect from './MultiSelect';
import { monthLabel, sortedMonths } from '../utils/dataHelpers';

const th = { padding: '8px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
const td = { padding: '7px 12px', color: '#e2e8f0', borderBottom: '1px solid #1e293b' };

const TOOLTIP_STYLE = { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 13 };

function Pill({ label, value, color, sub }) {
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '14px 20px', minWidth: 160 }}>
      <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ color: color || '#e2e8f0', fontSize: 26, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Convert "YYYY/MM/DD" to "YYYY-MM-DD" for ISO parsing
function toISO(dateStr) {
  return dateStr?.replace(/\//g, '-');
}

function isOnTime(row) {
  const shipped   = row['Shipped Date'];
  const scheduled = row['Scheduled Shipment Date'];
  if (!shipped || !scheduled) return null;
  return shipped <= scheduled; // string comparison works for YYYY/MM/DD
}

export default function Distribution({ data }) {
  // ── Section 1 (OTIF) filters ───────────────────────────────────────────────
  const [s1Customers, setS1Customers] = useState(new Set());
  const [s1Months,    setS1Months]    = useState(new Set());
  const [s1OrderType, setS1OrderType] = useState('All'); // 'All' | 'Sales Orders' | 'Transfer Orders'

  // ── Section 2 (Volume) filters ─────────────────────────────────────────────
  const [s2Customers, setS2Customers] = useState(new Set());
  const [s2Items,     setS2Items]     = useState(new Set());

  // ── Derived option lists ───────────────────────────────────────────────────
  const allCustomers = useMemo(() =>
    [...new Set(data.map(r => r['Customer Name']).filter(Boolean))].sort(), [data]);

  const allMonths = useMemo(() => {
    const months = data.map(r => monthLabel(toISO(r['Shipped Date']))).filter(m => m !== 'Unknown');
    return sortedMonths(months);
  }, [data]);

  const allItems = useMemo(() =>
    [...new Set(data.map(r => r['Item']).filter(Boolean))].sort(), [data]);

  // ── Section 1 — OTIF Delivery Performance ─────────────────────────────────

  // Group data by shipment number first
  const shipments = useMemo(() => {
    const map = {};
    data.forEach(row => {
      const shipNum = row['Shipment Number'];
      if (!shipNum) return;
      if (!map[shipNum]) {
        map[shipNum] = {
          shipmentNumber: shipNum,
          salesOrderNumber: row['Sales Order Number'],
          transferOrderNumber: row['Transfer Order Number'],
          outsideProcessingOrderNumber: row['Outside Processing Order Number'],
          customerName: row['Customer Name'],
          customerNumber: row['Customer Number'],
          scheduledShipDate: row['Scheduled Shipment Date'],
          shippedDate: row['Shipped Date'],
          orderType: row['Transfer Order Number'] && !row['Sales Order Number'] ? 'Transfer Order' : 'Sales Order',
          lines: 0,
          shippedQty: 0,
        };
      }
      map[shipNum].lines++;
      map[shipNum].shippedQty += Number(row['Shipped Quantity']) || 0;
    });
    return Object.values(map);
  }, [data]);

  const s1Filtered = useMemo(() => {
    return shipments.filter(s => {
      if (s1Customers.size > 0 && !s1Customers.has(s.customerName)) return false;
      if (s1Months.size > 0) {
        const m = monthLabel(toISO(s.shippedDate));
        if (!s1Months.has(m)) return false;
      }
      if (s1OrderType === 'Sales Orders' && s.orderType !== 'Sales Order') return false;
      if (s1OrderType === 'Transfer Orders' && s.orderType !== 'Transfer Order') return false;
      return true;
    });
  }, [shipments, s1Customers, s1Months, s1OrderType]);

  const s1OnTime = useMemo(() => s1Filtered.filter(s => s.shippedDate && s.scheduledShipDate && s.shippedDate <= s.scheduledShipDate).length, [s1Filtered]);
  const s1Late   = useMemo(() => s1Filtered.filter(s => s.shippedDate && s.scheduledShipDate && s.shippedDate > s.scheduledShipDate).length, [s1Filtered]);
  const s1OTIFPct = s1Filtered.length > 0 ? ((s1OnTime / s1Filtered.length) * 100).toFixed(1) : '0.0';
  const otifColor = parseFloat(s1OTIFPct) >= 95 ? '#10b981' : parseFloat(s1OTIFPct) >= 80 ? '#f59e0b' : '#ef4444';

  const s1ChartData = useMemo(() => {
    const byMonth = {};
    s1Filtered.forEach(s => {
      const m = monthLabel(toISO(s.shippedDate));
      if (m === 'Unknown') return;
      if (!byMonth[m]) byMonth[m] = { month: m, 'On Time': 0, Late: 0 };
      if (s.shippedDate && s.scheduledShipDate && s.shippedDate <= s.scheduledShipDate) {
        byMonth[m]['On Time']++;
      } else {
        byMonth[m].Late++;
      }
    });
    return sortedMonths(Object.keys(byMonth)).map(m => ({
      ...byMonth[m],
      'OTIF %': byMonth[m]['On Time'] + byMonth[m].Late > 0
        ? parseFloat(((byMonth[m]['On Time'] / (byMonth[m]['On Time'] + byMonth[m].Late)) * 100).toFixed(1))
        : 0,
    }));
  }, [s1Filtered]);

  const s1HasFilter = s1Customers.size > 0 || s1Months.size > 0 || s1OrderType !== 'All';

  // ── Section 2 — Volume Shipped ─────────────────────────────────────────────
  const s2Filtered = useMemo(() => {
    return data.filter(row => {
      if (s2Customers.size > 0 && !s2Customers.has(row['Customer Name'])) return false;
      if (s2Items.size > 0 && !s2Items.has(row['Item'])) return false;
      return true;
    });
  }, [data, s2Customers, s2Items]);

  const s2TotalQty = useMemo(() => s2Filtered.reduce((s, r) => s + (Number(r['Shipped Quantity']) || 0), 0), [s2Filtered]);
  const s2TotalShipments = useMemo(() => new Set(s2Filtered.map(r => r['Shipment Number']).filter(Boolean)).size, [s2Filtered]);
  const s2Avg = s2TotalShipments > 0 ? Math.round(s2TotalQty / s2TotalShipments) : 0;

  const s2ChartData = useMemo(() => {
    const byMonth = {};
    s2Filtered.forEach(row => {
      const m = monthLabel(toISO(row['Shipped Date']));
      if (m === 'Unknown') return;
      if (!byMonth[m]) byMonth[m] = { month: m, qty: 0 };
      byMonth[m].qty += Number(row['Shipped Quantity']) || 0;
    });
    return sortedMonths(Object.keys(byMonth)).map(m => byMonth[m]);
  }, [s2Filtered]);

  const s2TableData = useMemo(() => {
    const byMonthCustomer = {};
    s2Filtered.forEach(row => {
      const m   = monthLabel(toISO(row['Shipped Date']));
      const cus = row['Customer Name'] || 'Unknown';
      const key = `${m}|||${cus}`;
      if (!byMonthCustomer[key]) byMonthCustomer[key] = { month: m, customer: cus, qty: 0, shipments: new Set(), lines: 0 };
      byMonthCustomer[key].qty += Number(row['Shipped Quantity']) || 0;
      if (row['Shipment Number']) byMonthCustomer[key].shipments.add(row['Shipment Number']);
      byMonthCustomer[key].lines++;
    });
    return Object.values(byMonthCustomer).map(r => ({ ...r, shipmentCount: r.shipments.size }));
  }, [s2Filtered]);

  // Group by month for summary rows
  const s2ByMonth = useMemo(() => {
    const map = {};
    s2TableData.forEach(r => {
      if (!map[r.month]) map[r.month] = { qty: 0, shipments: 0, lines: 0, rows: [] };
      map[r.month].qty += r.qty;
      map[r.month].shipments += r.shipmentCount;
      map[r.month].lines += r.lines;
      map[r.month].rows.push(r);
    });
    return map;
  }, [s2TableData]);

  const s2HasFilter = s2Customers.size > 0 || s2Items.size > 0;

  return (
    <div>
      {/* ── Section 1: OTIF ─────────────────────────────────────────────────── */}
      <div id="dist-otif">
        <SectionHeader title="OTIF Delivery Performance" icon="🎯" />

        {/* Pills */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
          <Pill label="Total Shipments" value={s1Filtered.length} />
          <Pill label="On Time"         value={s1OnTime}         color="#10b981" />
          <Pill label="Late"            value={s1Late}           color="#ef4444" />
          <Pill label="OTIF %"          value={`${s1OTIFPct}%`}  color={otifColor} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <MultiSelect
            label="Customer:"
            options={allCustomers}
            selected={s1Customers}
            onChange={setS1Customers}
            allLabel="All customers"
            minWidth={200}
          />
          <MultiSelect
            label="Month (Shipped):"
            options={allMonths}
            selected={s1Months}
            onChange={setS1Months}
            allLabel="All months"
            minWidth={180}
          />
          {/* Order type toggle */}
          <div style={{ display: 'flex', gap: 4 }}>
            {['All', 'Sales Orders', 'Transfer Orders'].map(t => (
              <button key={t} onClick={() => setS1OrderType(t)}
                style={{
                  padding: '5px 12px', borderRadius: 20, border: '1px solid #334155', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: s1OrderType === t ? '#3b82f6' : '#1e293b',
                  color:      s1OrderType === t ? '#fff'    : '#94a3b8',
                  transition: 'all 0.15s',
                }}>
                {t}
              </button>
            ))}
          </div>
          {s1HasFilter && (
            <button onClick={() => { setS1Customers(new Set()); setS1Months(new Set()); setS1OrderType('All'); }}
              style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #475569', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Chart */}
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 16px', marginBottom: 24, border: '1px solid #334155' }}>
          <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Shipments by Month — On Time vs Late + OTIF %
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={s1ChartData} margin={{ top: 8, right: 50, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="On Time" stackId="a" fill="#10b981" name="On Time" />
              <Bar yAxisId="left" dataKey="Late"    stackId="a" fill="#ef4444" name="Late" />
              <Line yAxisId="right" type="monotone" dataKey="OTIF %" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} name="OTIF %" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden', marginBottom: 40 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Order Type</th>
                  <th style={th}>Order Number</th>
                  <th style={th}>Shipment #</th>
                  <th style={th}>Customer</th>
                  <th style={{ ...th, textAlign: 'right' }}>Lines</th>
                  <th style={{ ...th, textAlign: 'right' }}>Shipped Qty</th>
                  <th style={th}>Scheduled Ship</th>
                  <th style={th}>Shipped Date</th>
                  <th style={{ ...th, textAlign: 'right' }}>Delay (days)</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {s1Filtered.map((s, i) => {
                  const onTime = s.shippedDate && s.scheduledShipDate && s.shippedDate <= s.scheduledShipDate;
                  const delayDays = (s.shippedDate && s.scheduledShipDate)
                    ? Math.round((new Date(toISO(s.shippedDate)) - new Date(toISO(s.scheduledShipDate))) / 86400000)
                    : null;
                  const orderNum = s.orderType === 'Transfer Order'
                    ? (s.transferOrderNumber ?? '—')
                    : (s.salesOrderNumber ?? '—');
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#0f172a20' }}>
                      <td style={td}>{s.orderType}</td>
                      <td style={td}>{orderNum}</td>
                      <td style={td}>{s.shipmentNumber}</td>
                      <td style={td}>{s.customerName || '—'}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{s.lines}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{s.shippedQty.toLocaleString()}</td>
                      <td style={td}>{s.scheduledShipDate || '—'}</td>
                      <td style={td}>{s.shippedDate || '—'}</td>
                      <td style={{ ...td, textAlign: 'right', color: delayDays == null ? '#94a3b8' : delayDays > 0 ? '#ef4444' : '#10b981', fontWeight: delayDays != null ? 600 : 400 }}>
                        {delayDays == null ? '—' : delayDays > 0 ? `+${delayDays}` : delayDays}
                      </td>
                      <td style={td}>
                        <span style={{
                          background: onTime ? '#052e16' : '#2d0a0a',
                          color:      onTime ? '#4ade80' : '#f87171',
                          border: `1px solid ${onTime ? '#16a34a' : '#b91c1c'}`,
                          borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
                        }}>
                          {onTime ? 'On Time' : 'Late'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {s1Filtered.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No shipments match the current filters.</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 2: Volume Shipped ───────────────────────────────────────── */}
      <div id="dist-volume">
        <SectionHeader title="Volume Shipped" icon="📦" />

        {/* Pills */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
          <Pill label="Total Shipped Qty"  value={s2TotalQty.toLocaleString()} color="#3b82f6" />
          <Pill label="Total Shipments"    value={s2TotalShipments} />
          <Pill label="Avg per Shipment"   value={s2Avg.toLocaleString()} color="#8b5cf6" />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <MultiSelect
            label="Customer:"
            options={allCustomers}
            selected={s2Customers}
            onChange={setS2Customers}
            allLabel="All customers"
            minWidth={200}
          />
          <MultiSelect
            label="Item:"
            options={allItems}
            selected={s2Items}
            onChange={setS2Items}
            allLabel="All items"
            minWidth={180}
          />
          {s2HasFilter && (
            <button onClick={() => { setS2Customers(new Set()); setS2Items(new Set()); }}
              style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #475569', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Chart */}
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 16px', marginBottom: 24, border: '1px solid #334155' }}>
          <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Shipped Quantity by Month
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={s2ChartData} margin={{ top: 8, right: 20, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v.toLocaleString(), 'Shipped Qty']} />
              <Bar dataKey="qty" fill="#3b82f6" name="Shipped Qty" radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Table: month × customer with subtotals */}
        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden', marginBottom: 40 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Month</th>
                  <th style={th}>Customer</th>
                  <th style={{ ...th, textAlign: 'right' }}>Shipped Qty</th>
                  <th style={{ ...th, textAlign: 'right' }}># Shipments</th>
                  <th style={{ ...th, textAlign: 'right' }}># Lines</th>
                </tr>
              </thead>
              <tbody>
                {sortedMonths(Object.keys(s2ByMonth)).map(month => {
                  const { qty, shipments, lines, rows } = s2ByMonth[month];
                  return [
                    ...rows.map((r, i) => (
                      <tr key={`${month}-${i}`}>
                        <td style={{ ...td, color: '#64748b' }}>{i === 0 ? month : ''}</td>
                        <td style={td}>{r.customer}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{r.qty.toLocaleString()}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{r.shipmentCount}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{r.lines}</td>
                      </tr>
                    )),
                    <tr key={`${month}-summary`} style={{ background: '#0f172a', borderTop: '1px solid #334155' }}>
                      <td style={{ ...td, fontWeight: 700, color: '#e2e8f0' }}>{month} — Total</td>
                      <td style={{ ...td, color: '#64748b' }}></td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#3b82f6' }}>{qty.toLocaleString()}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{shipments}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{lines}</td>
                    </tr>,
                  ];
                })}
              </tbody>
            </table>
            {s2TableData.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No data matches the current filters.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
