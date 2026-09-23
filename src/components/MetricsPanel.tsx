/**
 * Time-Series Metrics Display Panel
 * Project: Integrated Healthcare Operations Dashboard
 * Timeline: October 2024 - December 2024
 *
 * Displays real-time infrastructure metrics with sparkline charts,
 * trend indicators, and configurable time ranges.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, gql } from '@apollo/client';

// ----------------------------------------------------------------
// GraphQL Query
// ----------------------------------------------------------------

const GET_METRICS = gql`
  query GetMetrics($timeRange: TimeRange!, $interval: String!) {
    metrics(timeRange: $timeRange, interval: $interval) {
      timestamp
      cpuUtilization
      memoryUtilization
      networkInMbps
      networkOutMbps
      diskReadIOPS
      diskWriteIOPS
      activeConnections
      requestsPerSecond
      errorRate
      latencyP50
      latencyP95
      latencyP99
    }
  }
`;

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface MetricDataPoint {
  timestamp: string;
  cpuUtilization: number;
  memoryUtilization: number;
  networkInMbps: number;
  networkOutMbps: number;
  diskReadIOPS: number;
  diskWriteIOPS: number;
  activeConnections: number;
  requestsPerSecond: number;
  errorRate: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
}

interface MetricsPanelProps {
  title: string;
  refreshInterval: number;
}

interface MetricCardConfig {
  key: keyof MetricDataPoint;
  label: string;
  unit: string;
  warningThreshold: number;
  criticalThreshold: number;
  format: (value: number) => string;
}

// ----------------------------------------------------------------
// Sparkline Component
// ----------------------------------------------------------------

const Sparkline: React.FC<{
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  warningThreshold?: number;
  criticalThreshold?: number;
}> = ({
  data,
  width = 200,
  height = 40,
  color = '#60a5fa',
  warningThreshold,
  criticalThreshold,
}) => {
  if (!data.length) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data
    .map((value, index) => {
      const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
      const y =
        height - padding - ((value - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(' ');

  const lastValue = data[data.length - 1];
  const lineColor =
    criticalThreshold && lastValue >= criticalThreshold
      ? '#ef4444'
      : warningThreshold && lastValue >= warningThreshold
      ? '#f59e0b'
      : color;

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Area fill */}
      <polyline
        points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
        fill={`${lineColor}15`}
        stroke="none"
      />
    </svg>
  );
};

// ----------------------------------------------------------------
// Metric Card Component
// ----------------------------------------------------------------

const MetricCard: React.FC<{
  config: MetricCardConfig;
  currentValue: number;
  history: number[];
  previousValue?: number;
}> = ({ config, currentValue, history, previousValue }) => {
  const formattedValue = config.format(currentValue);

  const isCritical = currentValue >= config.criticalThreshold;
  const isWarning =
    currentValue >= config.warningThreshold && !isCritical;

  const valueColor = isCritical
    ? '#ef4444'
    : isWarning
    ? '#f59e0b'
    : '#f1f5f9';

  let trendPercent = 0;
  if (previousValue && previousValue !== 0) {
    trendPercent = ((currentValue - previousValue) / previousValue) * 100;
  }

  const trendDirection =
    Math.abs(trendPercent) < 1
      ? 'stable'
      : trendPercent > 0
      ? 'up'
      : 'down';

  return (
    <div style={styles.metricCard}>
      <div style={styles.metricHeader}>
        <span style={styles.metricLabel}>{config.label}</span>
        {(isCritical || isWarning) && (
          <span
            style={{
              ...styles.alertDot,
              backgroundColor: isCritical ? '#ef4444' : '#f59e0b',
            }}
          />
        )}
      </div>
      <div style={{ ...styles.metricValue, color: valueColor }}>
        {formattedValue}
        <span style={styles.metricUnit}>{config.unit}</span>
      </div>
      <Sparkline
        data={history}
        color={valueColor === '#f1f5f9' ? '#60a5fa' : valueColor}
        warningThreshold={config.warningThreshold}
        criticalThreshold={config.criticalThreshold}
      />
      <div style={styles.metricFooter}>
        <span
          style={{
            ...styles.trendText,
            color:
              trendDirection === 'up'
                ? '#f59e0b'
                : trendDirection === 'down'
                ? '#10b981'
                : '#64748b',
          }}
        >
          {trendDirection === 'up'
            ? '\u2191'
            : trendDirection === 'down'
            ? '\u2193'
            : '\u2192'}{' '}
          {Math.abs(trendPercent).toFixed(1)}%
        </span>
        <span style={styles.trendLabel}>vs prev period</span>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------
// Time Range Selector
// ----------------------------------------------------------------

const TimeRangeSelector: React.FC<{
  selected: string;
  onChange: (range: string) => void;
}> = ({ selected, onChange }) => {
  const ranges = [
    { value: '15m', label: '15m' },
    { value: '1h', label: '1h' },
    { value: '6h', label: '6h' },
    { value: '24h', label: '24h' },
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
  ];

  return (
    <div style={styles.timeRangeSelector}>
      {ranges.map((range) => (
        <button
          key={range.value}
          style={{
            ...styles.timeRangeBtn,
            ...(selected === range.value ? styles.timeRangeBtnActive : {}),
          }}
          onClick={() => onChange(range.value)}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
};

// ----------------------------------------------------------------
// Main MetricsPanel Component
// ----------------------------------------------------------------

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  title,
  refreshInterval,
}) => {
  const [timeRange, setTimeRange] = useState('1h');
  const [metricsHistory, setMetricsHistory] = useState<MetricDataPoint[]>([]);

  // Generate mock data for demonstration
  useEffect(() => {
    const generateMockData = () => {
      const now = Date.now();
      const points: MetricDataPoint[] = [];
      for (let i = 60; i >= 0; i--) {
        points.push({
          timestamp: new Date(now - i * 60000).toISOString(),
          cpuUtilization: 30 + Math.random() * 20,
          memoryUtilization: 55 + Math.random() * 15,
          networkInMbps: 100 + Math.random() * 80,
          networkOutMbps: 60 + Math.random() * 50,
          diskReadIOPS: 2000 + Math.random() * 1500,
          diskWriteIOPS: 1500 + Math.random() * 1000,
          activeConnections: 800 + Math.floor(Math.random() * 400),
          requestsPerSecond: 450 + Math.random() * 200,
          errorRate: Math.random() * 0.5,
          latencyP50: 20 + Math.random() * 15,
          latencyP95: 45 + Math.random() * 30,
          latencyP99: 80 + Math.random() * 50,
        });
      }
      setMetricsHistory(points);
    };

    generateMockData();
    const interval = setInterval(generateMockData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const metricConfigs: MetricCardConfig[] = useMemo(
    () => [
      {
        key: 'cpuUtilization',
        label: 'CPU Utilization',
        unit: '%',
        warningThreshold: 70,
        criticalThreshold: 90,
        format: (v: number) => v.toFixed(1),
      },
      {
        key: 'memoryUtilization',
        label: 'Memory Usage',
        unit: '%',
        warningThreshold: 80,
        criticalThreshold: 95,
        format: (v: number) => v.toFixed(1),
      },
      {
        key: 'networkInMbps',
        label: 'Network In',
        unit: 'Mbps',
        warningThreshold: 800,
        criticalThreshold: 950,
        format: (v: number) => v.toFixed(0),
      },
      {
        key: 'activeConnections',
        label: 'Active Connections',
        unit: '',
        warningThreshold: 1500,
        criticalThreshold: 2000,
        format: (v: number) => v.toFixed(0),
      },
      {
        key: 'requestsPerSecond',
        label: 'Requests/sec',
        unit: 'req/s',
        warningThreshold: 800,
        criticalThreshold: 1000,
        format: (v: number) => v.toFixed(0),
      },
      {
        key: 'errorRate',
        label: 'Error Rate',
        unit: '%',
        warningThreshold: 1,
        criticalThreshold: 5,
        format: (v: number) => v.toFixed(2),
      },
      {
        key: 'latencyP50',
        label: 'Latency P50',
        unit: 'ms',
        warningThreshold: 100,
        criticalThreshold: 200,
        format: (v: number) => v.toFixed(0),
      },
      {
        key: 'latencyP95',
        label: 'Latency P95',
        unit: 'ms',
        warningThreshold: 200,
        criticalThreshold: 500,
        format: (v: number) => v.toFixed(0),
      },
    ],
    []
  );

  const latestMetrics =
    metricsHistory.length > 0
      ? metricsHistory[metricsHistory.length - 1]
      : null;

  const previousMetrics =
    metricsHistory.length > 1
      ? metricsHistory[Math.floor(metricsHistory.length / 2)]
      : null;

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <h3 style={styles.panelTitle}>{title}</h3>
        <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
      </div>
      <div style={styles.metricsGrid}>
        {metricConfigs.map((config) => (
          <MetricCard
            key={config.key}
            config={config}
            currentValue={
              latestMetrics ? (latestMetrics[config.key] as number) : 0
            }
            history={metricsHistory.map((m) => m[config.key] as number)}
            previousValue={
              previousMetrics
                ? (previousMetrics[config.key] as number)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------
// Styles
// ----------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: 20,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  timeRangeSelector: {
    display: 'flex',
    gap: 2,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    padding: 2,
  },
  timeRangeBtn: {
    padding: '4px 10px',
    borderRadius: 4,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 500,
  },
  timeRangeBtnActive: {
    backgroundColor: '#334155',
    color: '#f1f5f9',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
  },
  metricCard: {
    padding: 14,
    borderRadius: 6,
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 500,
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 8,
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: 400,
    color: '#64748b',
    marginLeft: 4,
  },
  metricFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  trendText: {
    fontSize: 12,
    fontWeight: 600,
  },
  trendLabel: {
    fontSize: 10,
    color: '#475569',
  },
};

export default MetricsPanel;
