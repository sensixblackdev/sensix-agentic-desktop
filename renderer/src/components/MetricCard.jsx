import React from 'react';

export function MetricCard({ label, value, sublabel, icon: Icon, trend, variant = 'default' }) {
  return (
    <div className={`metric-card metric-card-${variant}`}>
      <div className="metric-card-head">
        <span className="metric-label">{label}</span>
        {Icon && <Icon size={15} className="metric-icon" />}
      </div>
      <div className="metric-value-row">
        <strong className="metric-value">{value}</strong>
        {trend && <span className={`metric-trend trend-${trend.type}`}>{trend.label}</span>}
      </div>
      {sublabel && <small className="metric-sublabel">{sublabel}</small>}
    </div>
  );
}
