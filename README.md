# 🌍 Earthquake Monitoring System

A real-time earthquake monitoring dashboard powered by USGS data, built on a scalable event-streaming architecture.

## 🏗️ Architecture

This system demonstrates a complete migration from supply chain monitoring to earthquake monitoring while preserving the entire infrastructure:

- **Data Source**: USGS real-time earthquake feed (GeoJSON)
- **Event Streaming**: Kafka for reliable message processing
- **Data Storage**: PostgreSQL for earthquake events and KPIs
- **Real-time Updates**: WebSocket for live dashboard updates
- **Frontend**: React dashboard with Chart.js visualizations
- **Deployment**: Docker Compose with Apache reverse proxy

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- 2GB+ available RAM
- Internet connection for USGS API access

### Launch the System
```bash
# Clone and navigate to the project
git clone <repository-url>
cd supply-chain-spotlight

# Start all services
docker-compose up -d

# Wait for services to initialize (30-60 seconds)
# Check service status
docker-compose ps
```

### Access the Dashboard
- **Earthquake Dashboard**: http://localhost
- **API Endpoints**: http://localhost/api/quakes/kpis
- **WebSocket**: ws://localhost/ws

## 📊 Dashboard Features

### Real-time KPI Tiles
- **Total Earthquakes**: Count of all detected earthquakes today
- **Average Magnitude**: Mean magnitude of all earthquakes
- **Max Magnitude**: Highest magnitude recorded today  
- **Major Quakes**: Count of earthquakes with magnitude ≥ 5.0

### 7-Day Trend Chart
- Dual-axis visualization showing average and maximum magnitude trends
- Interactive Chart.js implementation with hover details
- Automatic updates via WebSocket every 60 seconds

### Live Status Indicator
- 🟢 Live: Connected and receiving real-time updates
- 🟡 Connecting: Establishing WebSocket connection
- 🔴 Disconnected: Connection lost

## 🔧 System Components

### Earthquake Producer (`earthquake-producer`)
- Polls USGS API every 60 seconds for new earthquake data
- Implements poll-and-diff pattern to avoid duplicates
- Sends new earthquakes to `earthquakes_raw` Kafka topic
- Handles ~2,000-4,000 events per day

### Earthquake Consumer (`earthquake-consumer`)
- Processes earthquake events from Kafka
- Stores raw earthquake data in PostgreSQL
- Calculates daily KPIs (count, avg/max magnitude, major quakes)
- Flushes KPIs every 60 seconds with WebSocket broadcast

### API Server (`api`)
- REST endpoint: `/api/quakes/kpis?days=N` for historical data
- WebSocket server on `/ws` for real-time updates
- Automatic data type conversion for frontend compatibility

### React Dashboard (`apache`)
- Modern responsive UI with earthquake-themed styling
- Real-time WebSocket integration
- Chart.js for trend visualizations
- Served via Apache with API proxy configuration

## 🗄️ Database Schema

### Earthquakes Table
```sql
CREATE TABLE earthquakes (
  id        TEXT PRIMARY KEY,
  mag       NUMERIC(4,1),
  place     TEXT,
  time      TIMESTAMPTZ,
  updated   TIMESTAMPTZ,
  lat       NUMERIC(8,5),
  lon       NUMERIC(8,5),
  depth_km  NUMERIC(5,1)
);
```

### Daily KPIs Table
```sql
CREATE TABLE kpi_quake_daily (
  day           DATE PRIMARY KEY,
  total_count   INT,
  avg_mag       NUMERIC(4,2),
  max_mag       NUMERIC(4,1),
  big_quakes    INT
);
```

## 🔄 Migration from Supply Chain

This project demonstrates a complete data source migration while preserving infrastructure:

### What Changed
- **Producer**: Polls USGS API instead of generating mock shipments
- **Consumer**: Processes earthquake events instead of shipment events
- **Database**: Added earthquake tables alongside existing supply chain tables
- **Dashboard**: New earthquake-focused UI components and styling
- **KPIs**: Earthquake-specific metrics (magnitude, count, major quakes)

### What Stayed the Same
- Kafka event streaming architecture
- PostgreSQL database with health checks
- WebSocket real-time communication
- Docker Compose orchestration
- Apache reverse proxy setup
- React + TypeScript frontend framework

## 🛠️ Development

### Building Components
```bash
# Compile TypeScript
cd producer && npx tsc
cd api && npx tsc

# Build React dashboard
cd dashboard && npm run build

# Rebuild containers
docker-compose build
```

### Monitoring
```bash
# View earthquake producer logs
docker-compose logs -f earthquake-producer

# View earthquake consumer logs  
docker-compose logs -f earthquake-consumer

# Check database
docker-compose exec postgres psql -U scs -d scs -c "SELECT COUNT(*) FROM earthquakes;"

# Test API
curl http://localhost:4000/api/quakes/kpis?days=7
```

### Switching Between Systems
The system supports both earthquake and supply chain monitoring:

```bash
# Run earthquake monitoring (current setup)
docker-compose up -d earthquake-producer earthquake-consumer

# Run supply chain monitoring
docker-compose up -d producer consumer

# Run both simultaneously (different topics/tables)
docker-compose up -d
```

## 📈 Performance & Scaling

- **Data Volume**: ~2,000-4,000 earthquakes/day
- **API Latency**: <100ms for KPI queries
- **WebSocket Updates**: Every 60 seconds
- **Memory Usage**: ~500MB total across all containers
- **Storage**: ~1MB/day for earthquake data

## 🌐 Data Source

**USGS Earthquake Hazards Program**
- Feed URL: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson
- Update Frequency: Every minute
- Coverage: Global earthquake detection
- Data Format: GeoJSON with earthquake properties

## 🔒 Production Considerations

- Add authentication for API endpoints
- Implement rate limiting for USGS API calls
- Set up monitoring and alerting
- Configure log aggregation
- Add SSL/TLS termination
- Implement data retention policies
- Add backup and disaster recovery

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `docker-compose up -d`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with**: TypeScript, React, Node.js, PostgreSQL, Kafka, Docker, Apache, Chart.js 