import React from 'react';
import { useQuery, gql } from '@apollo/client';
import MetricsPanel from './MetricsPanel';
import AlertsWidget from './AlertsWidget';

const DASHBOARD_QUERY = gql`
  query DashboardData {
    systemMetrics {
      uptime
      activeIncidents
      resolvedToday
      avgResponseTime
    }
    recentAlerts(limit: 10) {
      id
      severity
      message
      timestamp
      acknowledged
    }
  }
`;

const Dashboard: React.FC = () => {
  const { data, loading, error } = useQuery(DASHBOARD_QUERY, {
    pollInterval: 5000,
  });

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">Error: {error.message}</div>;

  return (
    <div className="dashboard">
      <div className="metrics-grid">
        <MetricsPanel
          title="System Uptime"
          value={`${data.systemMetrics.uptime}%`}
          status={data.systemMetrics.uptime > 99.9 ? 'healthy' : 'warning'}
        />
        <MetricsPanel
          title="Active Incidents"
          value={data.systemMetrics.activeIncidents}
          status={data.systemMetrics.activeIncidents > 5 ? 'critical' : 'healthy'}
        />
        <MetricsPanel
          title="Resolved Today"
          value={data.systemMetrics.resolvedToday}
          status="info"
        />
        <MetricsPanel
          title="Avg Response"
          value={`${data.systemMetrics.avgResponseTime}ms`}
          status={data.systemMetrics.avgResponseTime > 200 ? 'warning' : 'healthy'}
        />
      </div>
      <AlertsWidget alerts={data.recentAlerts} />
    </div>
  );
};

export default Dashboard;
