# Integrated Healthcare Operations Dashboard

Real-time healthcare operations dashboard using React 18 frontend, Node.js/GraphQL backend, and InfluxDB for time-series metrics including system uptime, incident tracking, and infrastructure health.

Personal project, built to explore building a real-time ops dashboard on a GraphQL + time-series stack. It is not production software — see **Status** below for exactly what is and isn't implemented.

## Status

**Implemented**

- React/TypeScript dashboard with metrics panel and alerts widget
- Apollo GraphQL schema and resolvers
- InfluxDB query layer (`server/influx.ts`)
- Docker Compose for local InfluxDB + server

**Not implemented / known limitations**

- No authentication or multi-tenancy
- No tests
- Alert thresholds are hardcoded, not configurable
- Never run against a production data source

## Built with

- **Node** — @apollo/client, @apollo/server, express, graphql, react, react-dom, typescript, @influxdata/influxdb-client

## Running it

```bash
npm install
npm start
```

## Layout

```
.env.example
docker-compose.yml
package.json
server/
  index.ts
  influx.ts
src/
  App.tsx
  components/
    AlertsWidget.tsx
    Dashboard.tsx
    MetricsPanel.tsx
  graphql/
    resolvers.ts
    schema.ts
tsconfig.json
```

