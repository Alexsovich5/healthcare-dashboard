/**
 * InfluxDB Client and Query Manager
 * Project: Integrated Healthcare Operations Dashboard
 * Author: Alexander Efrem - IT Operations Specialist, AEL Dubai
 * Timeline: October 2024 - December 2024
 *
 * Manages connections to InfluxDB for time-series metric storage
 * and retrieval. Handles Flux queries for infrastructure metrics,
 * SLO calculations, and trend analysis.
 */

import { InfluxDB, QueryApi, WriteApi, Point } from '@influxdata/influxdb-client';

interface InfluxConfig {
  url: string;
  token: string;
  org: string;
  bucket: string;
}

interface MetricPoint {
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

interface LatestMetrics {
  cpu: number;
  memory: number;
  networkThroughput: number;
  diskIOPS: number;
  activeInstances: number;
  healthyInstances: number;
}

export class InfluxDBClient {
  private client: InfluxDB;
  private queryApi: QueryApi;
  private writeApi: WriteApi;
  private org: string;
  private bucket: string;

  constructor(config: InfluxConfig) {
    this.client = new InfluxDB({
      url: config.url,
      token: config.token,
      timeout: 30000,
    });

    this.org = config.org;
    this.bucket = config.bucket;
    this.queryApi = this.client.getQueryApi(config.org);
    this.writeApi = this.client.getWriteApi(config.org, config.bucket, 'ns', {
      batchSize: 100,
      flushInterval: 5000,
      maxRetries: 3,
      retryJitter: 200,
    });

    console.log(`InfluxDB client initialized: ${config.url}, org=${config.org}`);
  }

  async queryLatestMetrics(start: string, end: string): Promise<LatestMetrics> {
    const fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: ${start}, stop: ${end})
        |> filter(fn: (r) => r["_measurement"] == "infrastructure")
        |> last()
        |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
    `;

    try {
      const rows: any[] = [];
      await new Promise<void>((resolve, reject) => {
        this.queryApi.queryRows(fluxQuery, {
          next(row, tableMeta) {
            rows.push(tableMeta.toObject(row));
          },
          error(error) {
            reject(error);
          },
          complete() {
            resolve();
          },
        });
      });

      if (rows.length === 0) {
        return {
          cpu: 0,
          memory: 0,
          networkThroughput: 0,
          diskIOPS: 0,
          activeInstances: 0,
          healthyInstances: 0,
        };
      }

      const latest = rows[0];
      return {
        cpu: latest.cpu_utilization || 0,
        memory: latest.memory_utilization || 0,
        networkThroughput: (latest.network_in || 0) + (latest.network_out || 0),
        diskIOPS: (latest.disk_read_iops || 0) + (latest.disk_write_iops || 0),
        activeInstances: latest.active_instances || 0,
        healthyInstances: latest.healthy_instances || 0,
      };
    } catch (error) {
      console.error('Failed to query latest metrics:', error);
      throw error;
    }
  }

  async queryMetricsSeries(
    start: string,
    end: string,
    interval: string
  ): Promise<MetricPoint[]> {
    const fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: ${start}, stop: ${end})
        |> filter(fn: (r) => r["_measurement"] == "infrastructure")
        |> aggregateWindow(every: ${interval}, fn: mean, createEmpty: false)
        |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"])
    `;

    try {
      const points: MetricPoint[] = [];
      await new Promise<void>((resolve, reject) => {
        this.queryApi.queryRows(fluxQuery, {
          next(row, tableMeta) {
            const data = tableMeta.toObject(row);
            points.push({
              timestamp: data._time,
              cpuUtilization: data.cpu_utilization || 0,
              memoryUtilization: data.memory_utilization || 0,
              networkInMbps: data.network_in || 0,
              networkOutMbps: data.network_out || 0,
              diskReadIOPS: data.disk_read_iops || 0,
              diskWriteIOPS: data.disk_write_iops || 0,
              activeConnections: data.active_connections || 0,
              requestsPerSecond: data.requests_per_second || 0,
              errorRate: data.error_rate || 0,
              latencyP50: data.latency_p50 || 0,
              latencyP95: data.latency_p95 || 0,
              latencyP99: data.latency_p99 || 0,
            });
          },
          error(error) {
            reject(error);
          },
          complete() {
            resolve();
          },
        });
      });

      return points;
    } catch (error) {
      console.error('Failed to query metrics series:', error);
      throw error;
    }
  }

  async writeMetricPoint(metrics: Partial<MetricPoint>): Promise<void> {
    const point = new Point('infrastructure')
      .tag('environment', 'production')
      .tag('region', 'me-south-1');

    if (metrics.cpuUtilization !== undefined) {
      point.floatField('cpu_utilization', metrics.cpuUtilization);
    }
    if (metrics.memoryUtilization !== undefined) {
      point.floatField('memory_utilization', metrics.memoryUtilization);
    }
    if (metrics.networkInMbps !== undefined) {
      point.floatField('network_in', metrics.networkInMbps);
    }
    if (metrics.networkOutMbps !== undefined) {
      point.floatField('network_out', metrics.networkOutMbps);
    }
    if (metrics.diskReadIOPS !== undefined) {
      point.floatField('disk_read_iops', metrics.diskReadIOPS);
    }
    if (metrics.diskWriteIOPS !== undefined) {
      point.floatField('disk_write_iops', metrics.diskWriteIOPS);
    }
    if (metrics.activeConnections !== undefined) {
      point.intField('active_connections', metrics.activeConnections);
    }
    if (metrics.requestsPerSecond !== undefined) {
      point.floatField('requests_per_second', metrics.requestsPerSecond);
    }
    if (metrics.errorRate !== undefined) {
      point.floatField('error_rate', metrics.errorRate);
    }
    if (metrics.latencyP50 !== undefined) {
      point.floatField('latency_p50', metrics.latencyP50);
    }
    if (metrics.latencyP95 !== undefined) {
      point.floatField('latency_p95', metrics.latencyP95);
    }
    if (metrics.latencyP99 !== undefined) {
      point.floatField('latency_p99', metrics.latencyP99);
    }

    this.writeApi.writePoint(point);
  }

  async flush(): Promise<void> {
    await this.writeApi.flush();
  }

  async close(): Promise<void> {
    await this.writeApi.close();
    console.log('InfluxDB client closed');
  }

  async healthCheck(): Promise<boolean> {
    try {
      const healthApi = this.client.getHealthApi();
      const health = await healthApi.getHealth();
      return health.status === 'pass';
    } catch {
      return false;
    }
  }
}

export function createInfluxClient(): InfluxDBClient {
  return new InfluxDBClient({
    url: process.env.INFLUX_URL || 'http://localhost:8086',
    token: process.env.INFLUX_TOKEN || '',
    org: process.env.INFLUX_ORG || 'ael-dubai',
    bucket: process.env.INFLUX_BUCKET || 'healthcare-metrics',
  });
}
