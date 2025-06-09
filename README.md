# Supply Chain Spotlight

A real-time supply chain monitoring dashboard that tracks shipment KPIs with live updates.

## What It Does

Simulates a supply chain system with shipment events flowing through Kafka. Calculates daily KPIs including on-time delivery percentage, average lead time, and late shipment counts. Displays metrics in a live dashboard with trend charts.

## Quick Start

Start all services:
```bash
docker compose up -d
```

Open your browser to http://localhost

## What You'll See

**KPI Tiles**: Real-time metrics for total shipments, on-time percentage, late count, and average lead time

**Trend Chart**: 7-day visualization of delivery performance and lead times

**Live Updates**: Automatic data refresh every 60 seconds via WebSocket

**Connection Status**: Green indicator shows live connection, red shows disconnected

## Architecture

**Producer**: Generates mock shipment events every 10 seconds
**Kafka**: Message broker for event streaming  
**Consumer**: Processes events and calculates KPIs
**PostgreSQL**: Stores shipment data and daily metrics
**API**: REST endpoints and WebSocket for live updates
**Dashboard**: React app with real-time charts
**Apache**: Web server with API proxy

## Stop Everything

```bash
docker compose down -v
```

## Requirements

Docker and Docker Compose installed. No other dependencies needed. 