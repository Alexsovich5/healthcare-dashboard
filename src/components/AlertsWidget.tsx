/**
 * Alert Aggregation Widget
 * Project: Integrated Healthcare Operations Dashboard
 * Author: Alexander Efrem - IT Operations Specialist, AEL Dubai
 * Timeline: October 2024 - December 2024
 *
 * Aggregates and displays alerts from multiple sources including
 * Microsoft Sentinel, AWS CloudWatch, and Palo Alto Prisma.
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useSubscription, gql } from '@apollo/client';

// ----------------------------------------------------------------
// GraphQL
// ----------------------------------------------------------------

const GET_ALERTS = gql`
  query GetAlerts($filter: AlertFilter) {
    alerts(filter: $filter) {
      id
      title
      severity
      source
      status
      description
      timestamp
      assignedTo
      acknowledgedAt
    }
  }
`;

const ALERT_SUBSCRIPTION = gql`
  subscription OnNewAlert {
    alertCreated {
      id
      title
      severity
      source
      timestamp
    }
  }
`;

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
type AlertStatus = 'new' | 'acknowledged' | 'investigating' | 'resolved';
type AlertSource = 'sentinel' | 'cloudwatch' | 'prisma' | 'crowdstrike' | 'servicenow';

interface Alert {
  id: string;
  title: string;
  severity: AlertSeverity;
  source: AlertSource;
  status: AlertStatus;
  description: string;
  timestamp: string;
  assignedTo?: string;
  acknowledgedAt?: string;
}

// ----------------------------------------------------------------
// Severity Configuration
// ----------------------------------------------------------------

const severityConfig: Record<
  AlertSeverity,
  { color: string; bgColor: string; label: string; priority: number }
> = {
  critical: { color: '#ef4444', bgColor: '#7f1d1d', label: 'CRITICAL', priority: 1 },
  high: { color: '#f59e0b', bgColor: '#78350f', label: 'HIGH', priority: 2 },
  medium: { color: '#3b82f6', bgColor: '#1e3a5f', label: 'MEDIUM', priority: 3 },
  low: { color: '#6b7280', bgColor: '#1f2937', label: 'LOW', priority: 4 },
};

const sourceIcons: Record<AlertSource, string> = {
  sentinel: 'S',
  cloudwatch: 'C',
  prisma: 'P',
  crowdstrike: 'F',
  servicenow: 'N',
};

// ----------------------------------------------------------------
// Alert Item Component
// ----------------------------------------------------------------

const AlertItem: React.FC<{
  alert: Alert;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
}> = ({ alert, onAcknowledge, onDismiss }) => {
  const config = severityConfig[alert.severity];
  const timeAgo = getTimeAgo(alert.timestamp);

  return (
    <div
      style={{
        ...styles.alertItem,
        borderLeft: `3px solid ${config.color}`,
      }}
    >
      <div style={styles.alertHeader}>
        <div style={styles.alertHeaderLeft}>
          <span
            style={{
              ...styles.severityBadge,
              backgroundColor: config.bgColor,
              color: config.color,
            }}
          >
            {config.label}
          </span>
          <span
            style={{
              ...styles.sourceBadge,
              backgroundColor: '#1e293b',
            }}
          >
            {sourceIcons[alert.source]} {alert.source}
          </span>
        </div>
        <span style={styles.alertTime}>{timeAgo}</span>
      </div>
      <div style={styles.alertTitle}>{alert.title}</div>
      <div style={styles.alertDescription}>{alert.description}</div>
      <div style={styles.alertFooter}>
        <div style={styles.alertMeta}>
          {alert.assignedTo && (
            <span style={styles.assignee}>@ {alert.assignedTo}</span>
          )}
          <span
            style={{
              ...styles.statusLabel,
              color:
                alert.status === 'resolved'
                  ? '#10b981'
                  : alert.status === 'investigating'
                  ? '#f59e0b'
                  : '#94a3b8',
            }}
          >
            {alert.status}
          </span>
        </div>
        <div style={styles.alertActions}>
          {alert.status === 'new' && (
            <button
              style={styles.actionBtn}
              onClick={() => onAcknowledge(alert.id)}
            >
              Acknowledge
            </button>
          )}
          <button
            style={styles.dismissBtn}
            onClick={() => onDismiss(alert.id)}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------
// Filter Bar Component
// ----------------------------------------------------------------

const FilterBar: React.FC<{
  selectedSeverity: AlertSeverity | 'all';
  selectedSource: AlertSource | 'all';
  onSeverityChange: (severity: AlertSeverity | 'all') => void;
  onSourceChange: (source: AlertSource | 'all') => void;
  alertCounts: Record<AlertSeverity, number>;
}> = ({
  selectedSeverity,
  selectedSource,
  onSeverityChange,
  onSourceChange,
  alertCounts,
}) => {
  return (
    <div style={styles.filterBar}>
      <div style={styles.filterGroup}>
        <FilterButton
          label={`All (${Object.values(alertCounts).reduce((a, b) => a + b, 0)})`}
          active={selectedSeverity === 'all'}
          onClick={() => onSeverityChange('all')}
        />
        {(Object.entries(severityConfig) as [AlertSeverity, typeof severityConfig['critical']][]).map(
          ([severity, config]) => (
            <FilterButton
              key={severity}
              label={`${config.label} (${alertCounts[severity] || 0})`}
              active={selectedSeverity === severity}
              onClick={() => onSeverityChange(severity)}
              color={config.color}
            />
          )
        )}
      </div>
      <select
        style={styles.sourceSelect}
        value={selectedSource}
        onChange={(e) => onSourceChange(e.target.value as AlertSource | 'all')}
      >
        <option value="all">All Sources</option>
        <option value="sentinel">Sentinel</option>
        <option value="cloudwatch">CloudWatch</option>
        <option value="prisma">Prisma</option>
        <option value="crowdstrike">CrowdStrike</option>
        <option value="servicenow">ServiceNow</option>
      </select>
    </div>
  );
};

const FilterButton: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}> = ({ label, active, onClick, color }) => (
  <button
    style={{
      ...styles.filterBtn,
      ...(active
        ? {
            backgroundColor: color ? `${color}20` : '#334155',
            color: color || '#f1f5f9',
            borderColor: color || '#475569',
          }
        : {}),
    }}
    onClick={onClick}
  >
    {label}
  </button>
);

// ----------------------------------------------------------------
// Main AlertsWidget Component
// ----------------------------------------------------------------

export const AlertsWidget: React.FC = () => {
  const [selectedSeverity, setSelectedSeverity] = useState<
    AlertSeverity | 'all'
  >('all');
  const [selectedSource, setSelectedSource] = useState<AlertSource | 'all'>(
    'all'
  );

  // Mock alerts for demonstration
  const [alerts] = useState<Alert[]>([
    {
      id: 'ALT-001',
      title: 'High CPU utilization on EKS node group',
      severity: 'high',
      source: 'cloudwatch',
      status: 'investigating',
      description: 'EKS worker node i-0abc123 CPU at 89% for 10 minutes',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      assignedTo: 'SOC Team',
    },
    {
      id: 'ALT-002',
      title: 'Failed MFA attempts from unknown IP',
      severity: 'high',
      source: 'sentinel',
      status: 'new',
      description: '12 failed MFA attempts for user j.smith from IP 203.0.113.42',
      timestamp: new Date(Date.now() - 300000).toISOString(),
    },
    {
      id: 'ALT-003',
      title: 'SSL certificate expiring in 14 days',
      severity: 'medium',
      source: 'cloudwatch',
      status: 'acknowledged',
      description: 'Certificate for api.ael-dubai.ae expires on 2024-12-28',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      assignedTo: 'Infrastructure',
    },
    {
      id: 'ALT-004',
      title: 'Unusual outbound traffic from IoT segment',
      severity: 'medium',
      source: 'prisma',
      status: 'investigating',
      description: 'Device 10.20.15.42 sending 500MB to external IP in last hour',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      assignedTo: 'Security Team',
    },
    {
      id: 'ALT-005',
      title: 'ServiceNow integration latency increased',
      severity: 'low',
      source: 'servicenow',
      status: 'new',
      description: 'API response time increased from 200ms to 450ms average',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'ALT-006',
      title: 'RDS storage approaching threshold',
      severity: 'medium',
      source: 'cloudwatch',
      status: 'acknowledged',
      description: 'Healthcare DB storage at 78% capacity (390GB / 500GB)',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      assignedTo: 'DBA Team',
    },
    {
      id: 'ALT-007',
      title: 'New CrowdStrike detection on endpoint',
      severity: 'medium',
      source: 'crowdstrike',
      status: 'new',
      description: 'Suspicious PowerShell execution detected on WS-ADMIN-045',
      timestamp: new Date(Date.now() - 1200000).toISOString(),
    },
  ]);

  const filteredAlerts = alerts
    .filter((a) => selectedSeverity === 'all' || a.severity === selectedSeverity)
    .filter((a) => selectedSource === 'all' || a.source === selectedSource)
    .sort(
      (a, b) =>
        severityConfig[a.severity].priority -
        severityConfig[b.severity].priority
    );

  const alertCounts: Record<AlertSeverity, number> = {
    critical: alerts.filter((a) => a.severity === 'critical').length,
    high: alerts.filter((a) => a.severity === 'high').length,
    medium: alerts.filter((a) => a.severity === 'medium').length,
    low: alerts.filter((a) => a.severity === 'low').length,
  };

  const handleAcknowledge = (id: string) => {
    console.log('Acknowledging alert:', id);
  };

  const handleDismiss = (id: string) => {
    console.log('Dismissing alert:', id);
  };

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <h3 style={styles.panelTitle}>Active Alerts</h3>
        <span style={styles.alertCount}>{alerts.length} alerts</span>
      </div>
      <FilterBar
        selectedSeverity={selectedSeverity}
        selectedSource={selectedSource}
        onSeverityChange={setSelectedSeverity}
        onSourceChange={setSelectedSource}
        alertCounts={alertCounts}
      />
      <div style={styles.alertList}>
        {filteredAlerts.map((alert) => (
          <AlertItem
            key={alert.id}
            alert={alert}
            onAcknowledge={handleAcknowledge}
            onDismiss={handleDismiss}
          />
        ))}
        {filteredAlerts.length === 0 && (
          <div style={styles.emptyState}>No alerts matching current filters</div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------

function getTimeAgo(timestamp: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(timestamp).getTime()) / 1000
  );

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

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
    marginBottom: 12,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  alertCount: {
    fontSize: 13,
    color: '#94a3b8',
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  filterGroup: {
    display: 'flex',
    gap: 4,
  },
  filterBtn: {
    padding: '4px 10px',
    borderRadius: 4,
    border: '1px solid #334155',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    fontSize: 11,
    cursor: 'pointer',
  },
  sourceSelect: {
    padding: '4px 8px',
    borderRadius: 4,
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    fontSize: 12,
  },
  alertList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 500,
    overflowY: 'auto',
  },
  alertItem: {
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#0f172a',
  },
  alertHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertHeaderLeft: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
  },
  severityBadge: {
    padding: '2px 6px',
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 700,
  },
  sourceBadge: {
    padding: '2px 6px',
    borderRadius: 3,
    fontSize: 10,
    color: '#94a3b8',
  },
  alertTime: {
    fontSize: 11,
    color: '#64748b',
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  alertFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertMeta: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  assignee: {
    fontSize: 11,
    color: '#60a5fa',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: 500,
  },
  alertActions: {
    display: 'flex',
    gap: 6,
  },
  actionBtn: {
    padding: '3px 8px',
    borderRadius: 3,
    border: '1px solid #3b82f6',
    backgroundColor: 'transparent',
    color: '#60a5fa',
    fontSize: 11,
    cursor: 'pointer',
  },
  dismissBtn: {
    padding: '3px 8px',
    borderRadius: 3,
    border: '1px solid #334155',
    backgroundColor: 'transparent',
    color: '#64748b',
    fontSize: 11,
    cursor: 'pointer',
  },
  emptyState: {
    padding: 24,
    textAlign: 'center' as const,
    color: '#64748b',
    fontSize: 13,
  },
};

export default AlertsWidget;
