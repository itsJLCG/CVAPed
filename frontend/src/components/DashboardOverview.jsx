import React, { useMemo } from 'react';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import './DashboardOverview.css';

const SCORE_RANGE_COLORS = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#10b981'];

const APPOINTMENT_COLORS = {
  Completed: '#059669',
  Upcoming: '#3b82f6',
  Today: '#f59e0b',
  Cancelled: '#6b7280',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="do-tooltip">
      <p className="do-tooltip-label">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="do-tooltip-value" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div className="do-empty-state">
      <span>{icon}</span>
      <p>{message}</p>
    </div>
  );
}

function ChartCard({ title, icon, children, gridArea, className = '' }) {
  return (
    <div className={`do-chart-card ${className}`} style={gridArea ? { gridArea } : undefined}>
      <div className="do-chart-header">
        <h3 className="do-chart-title">
          <span className="do-chart-icon">{icon}</span>
          {title}
        </h3>
      </div>
      <div className="do-chart-body">
        {children}
      </div>
    </div>
  );
}

/* ====== CHART 1: Metric Cards ====== */
function MetricCards({ stats, selectedDays, setSelectedDays }) {
  const avgScore = useMemo(() => {
    const scores = stats.average_scores || {};
    const vals = [scores.articulation || 0, scores.language || 0, scores.fluency || 0].filter(v => v > 0);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [stats.average_scores]);

  const cards = [
    {
      title: 'Total Patients',
      value: stats.total_patients || 0,
      badge: 'Registered',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      icon: '\u{1F465}',
    },
    {
      title: 'Total Sessions',
      value: stats.total_sessions || 0,
      badge: null,
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      icon: '\u{1F4CB}',
      hasFilter: true,
    },
    {
      title: 'Active Patients',
      value: stats.active_patients || 0,
      badge: 'Last 30 Days',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      icon: '\u2705',
    },
    {
      title: 'Avg Score',
      value: avgScore > 0 ? `${avgScore}%` : '\u2014',
      badge: 'All Therapies',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      icon: '\u{1F3AF}',
    },
  ];

  return (
    <div className="do-metrics-row">
      {cards.map((card, i) => (
        <div key={i} className="do-metric-card">
          <div className="do-metric-icon" style={{ background: card.gradient }}>
            <span className="do-metric-emoji">{card.icon}</span>
          </div>
          <div className="do-metric-details">
            <h3 className="do-metric-value">{card.value}</h3>
            <p className="do-metric-label">{card.title}</p>
            {card.hasFilter ? (
              <select
                className="do-metric-filter"
                value={selectedDays}
                onChange={(e) => setSelectedDays(e.target.value)}
              >
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="180">Last 6 Months</option>
                <option value="365">Last Year</option>
                <option value="all">All Time</option>
              </select>
            ) : card.badge ? (
              <span className="do-metric-badge">{card.badge}</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ====== CHART 2: Session Trend (Area Chart) ====== */
function SessionTrendChart({ data }) {
  const chartData = useMemo(() => {
    if (!data?.length) return [];
    return data.map(d => ({
      ...d,
      label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [data]);

  if (!chartData.length) {
    return <EmptyState icon="\u{1F4C8}" message="No session trend data available" />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="do-grad-art" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="do-grad-lang" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="do-grad-flu" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="articulation" name="Articulation" stroke="#f59e0b" strokeWidth={2} fill="url(#do-grad-art)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        <Area type="monotone" dataKey="language" name="Language" stroke="#8b5cf6" strokeWidth={2} fill="url(#do-grad-lang)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        <Area type="monotone" dataKey="fluency" name="Fluency" stroke="#10b981" strokeWidth={2} fill="url(#do-grad-flu)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ====== CHART 3: Therapy Distribution (Donut) ====== */
function TherapyDistributionChart({ stats }) {
  const data = useMemo(() => {
    return [
      { name: 'Articulation', value: stats.articulation_sessions || 0, color: '#f59e0b' },
      { name: 'Language', value: stats.language_sessions || 0, color: '#8b5cf6' },
      { name: 'Fluency', value: stats.fluency_sessions || 0, color: '#10b981' },
    ].filter(d => d.value > 0);
  }, [stats.articulation_sessions, stats.language_sessions, stats.fluency_sessions]);

  if (!data.length) {
    return <EmptyState icon="\u{1F4CA}" message="No session data available" />;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="do-pie-wrapper">
      <div className="do-pie-chart-area">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={2}
              stroke="#fff"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0];
              return (
                <div className="do-tooltip">
                  <p className="do-tooltip-label">{d.name}</p>
                  <p className="do-tooltip-value">{d.value} sessions ({((d.value / total) * 100).toFixed(1)}%)</p>
                </div>
              );
            }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="do-pie-center">
          <span className="do-pie-center-value">{total}</span>
          <span className="do-pie-center-label">Total</span>
        </div>
      </div>
      <div className="do-pie-legend">
        {data.map(d => (
          <div key={d.name} className="do-pie-legend-item">
            <span className="do-pie-legend-dot" style={{ background: d.color }}></span>
            <span className="do-pie-legend-name">{d.name}</span>
            <span className="do-pie-legend-value">{d.value}</span>
            <span className="do-pie-legend-pct">{((d.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ====== CHART 4: Average Scores (Horizontal Bar) ====== */
function AverageScoresChart({ scores }) {
  const data = useMemo(() => [
    { name: 'Articulation', score: scores?.articulation || 0, fill: '#f59e0b' },
    { name: 'Language', score: scores?.language || 0, fill: '#8b5cf6' },
    { name: 'Fluency', score: scores?.fluency || 0, fill: '#10b981' },
  ], [scores]);

  const hasData = data.some(d => d.score > 0);
  if (!hasData) return <EmptyState icon="\u{1F4C8}" message="No score data available" />;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={{ stroke: '#e2e8f0' }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12, fill: '#1f2937', fontWeight: 600 }}
          width={90}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={({ active, payload }) => {
          if (!active || !payload?.length) return null;
          return (
            <div className="do-tooltip">
              <p className="do-tooltip-label">{payload[0].payload.name}</p>
              <p className="do-tooltip-value">{payload[0].value.toFixed(1)}%</p>
            </div>
          );
        }} />
        <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={24}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ====== CHART 5: Patient Engagement Gauge ====== */
function PatientEngagementGauge({ active, total }) {
  const rate = total > 0 ? Math.round((active / total) * 100) : 0;
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (rate / 100) * circumference;
  const rateColor = rate >= 70 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="do-engage-container">
      <div className="do-engage-ring">
        <svg viewBox="0 0 128 128" className="do-engage-svg">
          <circle cx="64" cy="64" r="54" fill="none" stroke="#f1f5f9" strokeWidth="10" />
          <circle
            cx="64" cy="64" r="54"
            fill="none" stroke={rateColor} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 64 64)"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="do-engage-center">
          <span className="do-engage-pct" style={{ color: rateColor }}>{rate}%</span>
        </div>
      </div>
      <div className="do-engage-stats">
        <div className="do-engage-row">
          <span className="do-engage-dot" style={{ background: rateColor }}></span>
          <span className="do-engage-label">Active</span>
          <span className="do-engage-value">{active}</span>
        </div>
        <div className="do-engage-row">
          <span className="do-engage-dot" style={{ background: '#e2e8f0' }}></span>
          <span className="do-engage-label">Inactive</span>
          <span className="do-engage-value">{total - active}</span>
        </div>
        <div className="do-engage-row do-engage-total-row">
          <span className="do-engage-label">Total</span>
          <span className="do-engage-value">{total}</span>
        </div>
      </div>
    </div>
  );
}

/* ====== CHART 6: Appointment Status (Donut) ====== */
function AppointmentStatusChart({ appointments }) {
  const data = useMemo(() => {
    if (!appointments) return [];
    return [
      { name: 'Completed', value: appointments.completed || 0, color: APPOINTMENT_COLORS.Completed },
      { name: 'Upcoming', value: appointments.upcoming || 0, color: APPOINTMENT_COLORS.Upcoming },
      { name: 'Today', value: appointments.today || 0, color: APPOINTMENT_COLORS.Today },
      { name: 'Cancelled', value: appointments.cancelled || 0, color: APPOINTMENT_COLORS.Cancelled },
    ].filter(d => d.value > 0);
  }, [appointments]);

  if (!data.length) return <EmptyState icon="\u{1F4C5}" message="No appointment data available" />;

  return (
    <div className="do-pie-wrapper">
      <div className="do-pie-chart-area">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={2}
              stroke="#fff"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="do-tooltip">
                  <p className="do-tooltip-label">{payload[0].name}</p>
                  <p className="do-tooltip-value">{payload[0].value} appointments</p>
                </div>
              );
            }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="do-pie-center">
          <span className="do-pie-center-value">{appointments?.completion_rate || 0}%</span>
          <span className="do-pie-center-label">Rate</span>
        </div>
      </div>
      <div className="do-pie-legend">
        {data.map(d => (
          <div key={d.name} className="do-pie-legend-item">
            <span className="do-pie-legend-dot" style={{ background: d.color }}></span>
            <span className="do-pie-legend-name">{d.name}</span>
            <span className="do-pie-legend-value">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ====== CHART 7: Score Distribution (Vertical Bar) ====== */
function ScoreDistributionChart({ data }) {
  if (!data?.length || data.every(d => d.count === 0)) {
    return <EmptyState icon="\u{1F4CA}" message="No score distribution data available" />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="range"
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={{ stroke: '#e2e8f0' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={({ active, payload, label }) => {
          if (!active || !payload?.length) return null;
          return (
            <div className="do-tooltip">
              <p className="do-tooltip-label">Score: {label}%</p>
              <p className="do-tooltip-value">{payload[0].value} trials</p>
            </div>
          );
        }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={36}>
          {data.map((entry, i) => (
            <Cell key={i} fill={SCORE_RANGE_COLORS[i] || '#64748b'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ====== CHART 8: Weekly Activity Pattern (Stacked Bar) ====== */
function WeeklyActivityChart({ data }) {
  if (!data?.length || data.every(d => d.total === 0)) {
    return <EmptyState icon="\u{1F4C5}" message="No weekly activity data available" />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={{ stroke: '#e2e8f0' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="articulation" name="Articulation" fill="#f59e0b" stackId="stack" />
        <Bar dataKey="language" name="Language" fill="#8b5cf6" stackId="stack" />
        <Bar dataKey="fluency" name="Fluency" fill="#10b981" stackId="stack" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const GENDER_META = {
  male:   { label: 'Male',   icon: '\u2642\uFE0F', color: '#3b82f6' },
  female: { label: 'Female', icon: '\u2640\uFE0F', color: '#ec4899' },
  other:  { label: 'Other',  icon: '\u26A7\uFE0F', color: '#8b5cf6' },
};

/* ====== CHART 9: Patient Demographics (Horizontal Bar) ====== */
function PatientDemographicsChart({ reportsData }) {
  const data = useMemo(() => {
    if (!reportsData?.ageBrackets?.length) return [];
    return reportsData.ageBrackets.map(b => ({
      range: b.range,
      count: b.count,
      isHighest: b.isHighest,
      fill: b.isHighest ? 'var(--color-primary)' : 'var(--color-secondary)',
    }));
  }, [reportsData]);

  if (!data.length) return <EmptyState icon="\u{1F465}" message="No demographic data available" />;

  const genderData = reportsData?.genderDistribution ?? [];
  const totalGender = genderData.reduce((s, g) => s + (g.count || 0), 0);

  return (
    <div className="do-demographics-wrapper">
      {/* Age bar color legend */}
      <div className="do-age-legend">
        <span className="do-age-legend-item">
          <span className="do-age-legend-swatch do-age-swatch-primary"></span>
          Largest age group
        </span>
        <span className="do-age-legend-item">
          <span className="do-age-legend-swatch do-age-swatch-secondary"></span>
          Other age groups
        </span>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, left: 5, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="range"
            tick={{ fontSize: 11, fill: '#1f2937', fontWeight: 500 }}
            width={50}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="do-tooltip">
                <p className="do-tooltip-label">Age {d.range}</p>
                <p className="do-tooltip-value">{d.count} patients{d.isHighest ? ' \u2014 largest group' : ''}</p>
              </div>
            );
          }} />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20} label={{ position: 'right', fontSize: 11, fill: '#64748b' }}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Gender legend */}
      {genderData.length > 0 && (
        <div className="do-gender-section">
          <p className="do-gender-section-title">Gender Distribution</p>
          <div className="do-gender-grid">
            {genderData.map(g => {
              const meta = GENDER_META[g.gender] ?? { label: g.gender, icon: '\u{1F464}', color: '#64748b' };
              const pct = totalGender > 0 ? Math.round((g.count / totalGender) * 100) : (g.percentage ?? 0);
              return (
                <div key={g.gender} className="do-gender-card" style={{ '--gender-color': meta.color }}>
                  <div className="do-gender-card-header">
                    <span className="do-gender-icon">{meta.icon}</span>
                    <span className="do-gender-name">{meta.label}</span>
                    <span className="do-gender-pct-badge">{pct}%</span>
                  </div>
                  <p className="do-gender-card-count">{g.count} <span>patients</span></p>
                  <div className="do-gender-bar-track">
                    <div className="do-gender-bar-fill" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ====== CHART 10: Recent Activities Feed ====== */
function RecentActivitiesList({ activities }) {
  if (!activities?.length) {
    return <EmptyState icon="\u{1F4ED}" message="No recent activities yet" />;
  }

  const getTherapyIcon = (type) => {
    if (type === 'Articulation') return '\u{1F5E3}\uFE0F';
    if (type === 'Language') return '\u{1F4D6}';
    if (type === 'Fluency') return '\u{1F4AC}';
    return '\u{1F4CB}';
  };

  return (
    <div className="do-activities-list">
      {activities.map((activity, index) => (
        <div className="do-activity-item" key={index}>
          <div className="do-activity-icon">
            {getTherapyIcon(activity.therapy_type)}
          </div>
          <div className="do-activity-info">
            <span className="do-activity-patient">{activity.patient_name}</span>
            <span className="do-activity-detail">
              {activity.therapy_type}{activity.detail ? ` \u2014 ${activity.detail}` : ''}
            </span>
          </div>
          <div className="do-activity-meta">
            <span className={`do-activity-score ${activity.score >= 80 ? 'score-high' : activity.score >= 50 ? 'score-mid' : 'score-low'}`}>
              {activity.score != null ? `${activity.score}%` : '\u2014'}
            </span>
            <span className="do-activity-time">
              {activity.timestamp
                ? new Date(activity.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : ''}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ====== MAIN COMPONENT ====== */
function DashboardOverview({ overviewStats, reportsData, selectedDays, setSelectedDays, loadingStats }) {
  if (loadingStats) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner"></div>
        <p>Loading statistics...</p>
      </div>
    );
  }

  if (!overviewStats) {
    return (
      <div className="no-data-message">
        <span className="no-data-icon">{'\u{1F4CA}'}</span>
        <h3>No Statistics Available</h3>
        <p>Unable to load dashboard statistics. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="do-container">
      {/* Row 1: Key Metric Cards */}
      <MetricCards
        stats={overviewStats}
        selectedDays={selectedDays}
        setSelectedDays={setSelectedDays}
      />

      {/* Charts Grid */}
      <div className="do-charts-grid">
        {/* Session Trend - spans 2 columns */}
        <ChartCard title="Session Trend" icon={'\u{1F4C8}'} gridArea="trend">
          <div className="do-trend-legend">
            <span className="do-trend-legend-item"><span className="do-trend-dot" style={{ background: '#f59e0b' }}></span>Articulation</span>
            <span className="do-trend-legend-item"><span className="do-trend-dot" style={{ background: '#8b5cf6' }}></span>Language</span>
            <span className="do-trend-legend-item"><span className="do-trend-dot" style={{ background: '#10b981' }}></span>Fluency</span>
          </div>
          <SessionTrendChart data={overviewStats.session_trend} />
        </ChartCard>

        {/* Therapy Distribution Donut */}
        <ChartCard title="Therapy Distribution" icon={'\u{1F4CA}'} gridArea="distribution">
          <TherapyDistributionChart stats={overviewStats} />
        </ChartCard>

        {/* Average Scores */}
        <ChartCard title="Average Scores" icon={'\u{1F3C6}'} gridArea="scores">
          <AverageScoresChart scores={overviewStats.average_scores} />
        </ChartCard>

        {/* Appointment Status */}
        <ChartCard title="Appointments" icon={'\u{1F4C5}'} gridArea="appointments">
          <AppointmentStatusChart appointments={overviewStats.appointments} />
        </ChartCard>

        {/* Patient Engagement Gauge */}
        <ChartCard title="Patient Engagement" icon={'\u{1F4A1}'} gridArea="engagement">
          <PatientEngagementGauge
            active={overviewStats.active_patients || 0}
            total={overviewStats.total_patients || 0}
          />
        </ChartCard>

        {/* Weekly Activity Pattern */}
        <ChartCard title="Weekly Activity" icon={'\u{1F4C6}'} gridArea="weekly">
          <div className="do-trend-legend">
            <span className="do-trend-legend-item"><span className="do-trend-dot" style={{ background: '#f59e0b' }}></span>Articulation</span>
            <span className="do-trend-legend-item"><span className="do-trend-dot" style={{ background: '#8b5cf6' }}></span>Language</span>
            <span className="do-trend-legend-item"><span className="do-trend-dot" style={{ background: '#10b981' }}></span>Fluency</span>
          </div>
          <WeeklyActivityChart data={overviewStats.weekly_pattern} />
        </ChartCard>

        {/* Score Distribution */}
        <ChartCard title="Score Distribution" icon={'\u{1F4CA}'} gridArea="scoredist">
          <ScoreDistributionChart data={overviewStats.score_distribution} />
        </ChartCard>

        {/* Patient Demographics */}
        <ChartCard title="Patient Demographics" icon={'\u{1F465}'} gridArea="demographics">
          <PatientDemographicsChart reportsData={reportsData} />
        </ChartCard>

        {/* Recent Activities */}
        <ChartCard title="Recent Activities" icon={'\u{1F551}'} gridArea="activities" className="do-activities-card">
          <RecentActivitiesList activities={overviewStats.recent_activities} />
        </ChartCard>
      </div>
    </div>
  );
}

export default DashboardOverview;
