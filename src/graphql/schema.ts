/**
 * GraphQL Schema Type Definitions
 * Project: Integrated Healthcare Operations Dashboard
 * Timeline: October 2024 - December 2024
 */

export const typeDefs = `#graphql
  scalar DateTime
  scalar JSON

  input TimeRange {
    start: DateTime!
    end: DateTime!
  }

  input AlertFilter {
    severity: [AlertSeverity!]
    source: [AlertSource!]
    status: [AlertStatus!]
    limit: Int
    offset: Int
  }

  enum AlertSeverity {
    CRITICAL
    HIGH
    MEDIUM
    LOW
  }

  enum AlertSource {
    SENTINEL
    CLOUDWATCH
    PRISMA
    CROWDSTRIKE
    SERVICENOW
  }

  enum AlertStatus {
    NEW
    ACKNOWLEDGED
    INVESTIGATING
    RESOLVED
    DISMISSED
  }

  enum ServiceStatus {
    HEALTHY
    DEGRADED
    DOWN
    MAINTENANCE
  }

  type InfrastructureMetrics {
    cpuUtilization: Float!
    memoryUtilization: Float!
    networkThroughput: Float!
    diskIOPS: Float!
    activeInstances: Int!
    healthyInstances: Int!
  }

  type MetricDataPoint {
    timestamp: DateTime!
    cpuUtilization: Float!
    memoryUtilization: Float!
    networkInMbps: Float!
    networkOutMbps: Float!
    diskReadIOPS: Float!
    diskWriteIOPS: Float!
    activeConnections: Int!
    requestsPerSecond: Float!
    errorRate: Float!
    latencyP50: Float!
    latencyP95: Float!
    latencyP99: Float!
  }

  type ServiceHealth {
    name: String!
    status: ServiceStatus!
    uptime: Float!
    latencyMs: Float!
    lastCheck: DateTime!
    endpoint: String
    region: String
  }

  type ComplianceStatus {
    overallScore: Float!
    totalChecks: Int!
    passedChecks: Int!
    failedChecks: Int!
    lastScanTime: DateTime!
    controls: [ComplianceControl!]
  }

  type ComplianceControl {
    id: String!
    name: String!
    status: String!
    category: String!
    lastChecked: DateTime!
  }

  type Alert {
    id: ID!
    title: String!
    severity: AlertSeverity!
    source: AlertSource!
    status: AlertStatus!
    description: String!
    timestamp: DateTime!
    assignedTo: String
    acknowledgedAt: DateTime
    resolvedAt: DateTime
    metadata: JSON
  }

  type AlertSummary {
    critical: Int!
    high: Int!
    medium: Int!
    low: Int!
    total: Int!
  }

  type NetworkZoneHealth {
    zoneName: String!
    status: ServiceStatus!
    activeDevices: Int!
    trafficMbps: Float!
    deniedFlows: Int!
    lastUpdated: DateTime!
  }

  type SLOStatus {
    name: String!
    target: Float!
    current: Float!
    burnRate: Float!
    budget: Float!
    budgetRemaining: Float!
    period: String!
  }

  type Query {
    infrastructureMetrics(timeRange: TimeRange!): InfrastructureMetrics!
    metrics(timeRange: TimeRange!, interval: String!): [MetricDataPoint!]!
    serviceHealth: [ServiceHealth!]!
    complianceStatus: ComplianceStatus!
    alerts(filter: AlertFilter): [Alert!]!
    alertSummary: AlertSummary!
    networkZones: [NetworkZoneHealth!]!
    sloStatus: [SLOStatus!]!
  }

  type Mutation {
    acknowledgeAlert(id: ID!): Alert!
    resolveAlert(id: ID!, resolution: String!): Alert!
    dismissAlert(id: ID!): Alert!
    assignAlert(id: ID!, assignee: String!): Alert!
    triggerComplianceScan: ComplianceStatus!
    refreshMetrics(source: String!): Boolean!
  }

  type Subscription {
    metricsUpdated: MetricDataPoint!
    alertCreated: Alert!
    serviceStatusChanged: ServiceHealth!
    complianceScoreChanged: ComplianceStatus!
  }
`;
