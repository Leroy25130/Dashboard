import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ScatterChart, Scatter, ReferenceLine,
} from 'recharts';
import { useData } from '../context/DataContext';
import { monthLabel, sortedMonths, daysBetween } from '../utils/dataHelpers';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6','#a78bfa','#fb923c','#34d399','#60a5fa','#fbbf24'];
const MONTHS_ABS = ['Jan 2026','Feb 2026','Mar 2026','Apr 2026','May 2026','Jun 2026','Jul 2026','Aug 2026','Sep 2026','Oct 2026','Nov 2026','Dec 2026'];

function Card({ title, icon, children, wide }) {
  return (
    <div style={{
      background: '#1e293b', borderRadius: 12, padding: 20,
      gridColumn: wide ? 'span 2' : 'span 1',
    }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: '#e2e8f0', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{icon}</span>{title}
      </div>
      {children}
    </div>
  );
}

const ttStyle = { contentStyle: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }, labelStyle: { color: '#e2e8f0' } };

export default function Overview() {
  const { woData, absorptionData } = useData();
  const data = useMemo(() => woData.filter(d => (d['Quantity Completed'] || 0) > 0), [woData]);

  /* ── Volume Released ── */
  const releasedChart = useMemo(() => {
    const byMonthItem = {};
    data.forEach(d => {
      const m = monthLabel(d['Actual Complete Date']);
      const key = d['Item Number'];
      if (!byMonthItem[m]) byMonthItem[m] = {};
      byMonthItem[m][key] = (byMonthItem[m][key] || 0) + (d['Quantity Completed'] || 0);
    });
    const months = sortedMonths(Object.keys(byMonthItem));
    const items = [...new Set(data.map(d => d['Item Number']))].sort();
    const chartData = months.map(m => ({ month: m, ...byMonthItem[m], __total: Object.values(byMonthItem[m]).reduce((s,v)=>s+v,0) }));
    return { chartData, items };
  }, [data]);

  /* ── Volume Manufactured ── */
  const mfgChart = useMemo(() => {
    const byMonthItem = {};
    data.forEach(d => {
      const m = monthLabel(d['Start Date']);
      const key = d['Item Number'];
      if (!byMonthItem[m]) byMonthItem[m] = {};
      byMonthItem[m][key] = (byMonthItem[m][key] || 0) + (d['Work Order Quantity'] || 0);
    });
    const months = sortedMonths(Object.keys(byMonthItem));
    const items = [...new Set(data.map(d => d['Item Number']))].sort();
    return { chartData: months.map(m => ({ month: m, ...byMonthItem[m] })), items };
  }, [data]);

  /* ── WO Status ── */
  const statusChart = useMemo(() => {
    const counts = {};
    data.forEach(d => { const s = d['Work Order Status'] || 'Unknown'; counts[s] = (counts[s] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [data]);

  /* ── Timeliness ── */
  const timelinessChart = useMemo(() =>
    data.map(d => ({
      wo: d['Work Order Number'],
      item: d['Item Number'],
      delta: daysBetween(d['Complete Date'], d['Actual Complete Date']),
    })).filter(r => r.delta !== null),
    [data]);

  /* ── Yield ── */
  const yieldChart = useMemo(() =>
    data
      .filter(d => d['Work Order Quantity'] > 0)
      .map(d => ({
        wo: String(d['Work Order Number']),
        item: d['Item Number'],
        yield: +((d['Quantity Completed'] / d['Work Order Quantity']) * 100).toFixed(1),
      }))
      .sort((a, b) => a.yield - b.yield),
    [data]);

  /* ── Routing ── */
  const routingChart = useMemo(() =>
    data
      .filter(d => d['Required Usage'] != null && d['Actual Quantity Usage'] != null)
      .map(d => ({
        wo: String(d['Work Order Number']),
        required: +(d['Required Usage'] || 0).toFixed(1),
        actual: +(d['Actual Quantity Usage'] || 0).toFixed(1),
      })),
    [data]);

  /* ── Absorption ── */
  const absorptionChart = useMemo(() => {
    const toMap = rows => Object.fromEntries((rows || []).map(r => [r.code, r]));
    const aopMap = toMap(absorptionData?.aop);
    const ltMap  = toMap(absorptionData?.lt);
    const actMap = toMap(absorptionData?.act);
    const codes  = Object.keys(aopMap);
    return MONTHS_ABS.map(m => {
      let aop = 0, lt = 0, act = 0;
      codes.forEach(c => { aop += aopMap[c]?.[m] ?? 0; act += actMap[c]?.[m] ?? 0; });
      return { month: m.replace(' 2026',''), AOP: aop, Actual: act };
    });
  }, [absorptionData]);

  /* ── Summary KPIs ── */
  const totalCompleted = data.reduce((s, d) => s + (d['Quantity Completed'] || 0), 0);
  const avgYield = useMemo(() => {
    const vals = data.filter(d => d['Work Order Quantity'] > 0).map(d => (d['Quantity Completed'] / d['Work Order Quantity']) * 100);
    return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : 'N/A';
  }, [data]);
  const lateWOs = data.filter(d => d['Complete Date'] && d['Actual Complete Date'] && new Date(d['Actual Complete Date']) > new Date(d['Complete Date'])).length;
  const onTimeWOs = data.filter(d => d['Complete Date'] && d['Actual Complete Date'] && new Date(d['Actual Complete Date']) <= new Date(d['Complete Date'])).length;

  const STATUS_COLOR = { Closed: '#10b981', Released: '#3b82f6', Unreleased: '#f59e0b', Cancelled: '#ef4444' };

  return (
    <div style={{ padding: '28px 36px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#f1f5f9' }}>Manufacturing Overview</h1>
        <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{data.length} work orders · quick-view of all KPIs</div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {[
          { label: 'Work Orders',       value: data.length,                    color: '#3b82f6' },
          { label: 'Total Qty Released', value: totalCompleted.toLocaleString(), color: '#10b981' },
          { label: 'Avg Yield',          value: `${avgYield}%`,                  color: '#8b5cf6' },
          { label: 'On Time',            value: onTimeWOs,                       color: '#10b981' },
          { label: 'Late',               value: lateWOs,                         color: '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#1e293b', borderRadius: 10, padding: '12px 20px', borderLeft: `4px solid ${color}`, minWidth: 140 }}>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>{label}</div>
            <div style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Chart grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>

        {/* Volume Released */}
        <Card title="Volume Released per Month" icon="📦" wide>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={releasedChart.chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip {...ttStyle} formatter={(v, n) => n === '__total' ? false : [Number(v).toLocaleString(), n]} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} formatter={n => n === '__total' ? null : n} />
              {releasedChart.items.map((item, i) => (
                <Bar key={item} dataKey={item} stackId="a" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Volume Manufactured */}
        <Card title="Volume Manufactured per Month" icon="🏭" wide>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mfgChart.chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip {...ttStyle} formatter={(v, n) => [Number(v).toLocaleString(), n]} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              {mfgChart.items.map((item, i) => (
                <Bar key={item} dataKey={item} stackId="a" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* WO Status */}
        <Card title="Work Orders Status" icon="📋">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
            {statusChart.map(({ status, count }) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: STATUS_COLOR[status] || '#64748b', flexShrink: 0 }} />
                <div style={{ color: '#94a3b8', fontSize: 13, width: 90 }}>{status}</div>
                <div style={{ flex: 1, background: '#334155', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${(count / data.length) * 100}%`, background: STATUS_COLOR[status] || '#64748b', height: '100%', borderRadius: 4 }} />
                </div>
                <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, width: 36, textAlign: 'right' }}>{count}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Timeliness */}
        <Card title="Work Orders Timeliness" icon="⏱️">
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="wo" name="WO" tick={false} label={{ value: 'Work Orders', fill: '#64748b', fontSize: 11 }} />
              <YAxis dataKey="delta" name="Delay (days)" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                content={({ payload }) => payload?.length ? (
                  <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', fontSize: 11 }}>
                    <div style={{ color: '#e2e8f0' }}>WO: {payload[0]?.payload?.wo}</div>
                    <div style={{ color: payload[0]?.payload?.delta > 0 ? '#ef4444' : '#10b981' }}>
                      {payload[0]?.payload?.delta > 0 ? 'Late' : 'Early'}: {Math.abs(payload[0]?.payload?.delta)}d
                    </div>
                  </div>
                ) : null}
              />
              <Scatter data={timelinessChart} fill="#3b82f6" fillOpacity={0.75} />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

        {/* Yield */}
        <Card title="Manufacturing Yield %" icon="📊">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={yieldChart} margin={{ top: 4, right: 8, bottom: 28, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="wo" tick={{ fill: '#94a3b8', fontSize: 9 }} angle={-45} textAnchor="end" interval={Math.floor(yieldChart.length / 10)} />
              <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
              <ReferenceLine y={95} stroke="#f59e0b" strokeDasharray="4 4" />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                content={({ payload }) => payload?.length ? (
                  <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', fontSize: 11 }}>
                    <div style={{ color: '#94a3b8' }}>{payload[0]?.payload?.item}</div>
                    <div style={{ color: payload[0]?.value < 95 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                      Yield: {payload[0]?.value}%
                    </div>
                  </div>
                ) : null}
              />
              <Bar dataKey="yield">
                {yieldChart.map((e, i) => <Cell key={i} fill={e.yield < 95 ? '#ef4444' : '#10b981'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Routing */}
        <Card title="Routing — Required vs Actual (min)" icon="⚙️">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={routingChart} margin={{ top: 4, right: 8, bottom: 28, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="wo" tick={{ fill: '#94a3b8', fontSize: 9 }} angle={-45} textAnchor="end" interval={Math.floor(routingChart.length / 10)} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip {...ttStyle} formatter={(v, n) => [`${v} min`, n]} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Bar dataKey="required" name="Required" fill="#3b82f6" />
              <Bar dataKey="actual"   name="Actual"   fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Absorption */}
        <Card title="Actual & Projected vs AOP" icon="🎯" wide>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={absorptionChart} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip {...ttStyle} formatter={(v, n) => [Number(v).toLocaleString(), n]} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Bar dataKey="AOP"    fill="#3b82f6" radius={[2,2,0,0]} />
              <Bar dataKey="Actual" fill="#10b981" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}
