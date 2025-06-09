# Earthquake Monitoring System

Real-time earthquake monitoring dashboard using USGS data with Kafka streaming architecture.

## Architecture

Event-driven system processing live earthquake data from USGS:

- **Data Source**: USGS real-time earthquake feed (GeoJSON)
- **Event Streaming**: Kafka for message processing
- **Data Storage**: PostgreSQL for events and KPIs
- **Real-time Updates**: WebSocket for live dashboard
- **Frontend**: React dashboard with Chart.js
- **Deployment**: Docker Compose with Apache proxy

## Quick Start

### Prerequisites
- Docker and Docker Compose
- 2GB+ available RAM
- Internet connection

### Launch
```bash
git clone <repository-url>
cd supply-chain-spotlight

docker-compose up -d

# Wait 30-60 seconds for initialization
docker-compose ps
```

### Access
- **Dashboard**: http://localhost
- **API**: http://localhost/api/quakes/kpis
- **WebSocket**: ws://localhost/ws

## Dashboard Features

### KPI Tiles
- Total earthquakes today
- Average magnitude
- Maximum magnitude  
- Major quakes (≥ 5.0)
- Depth analysis (average, max, shallow count)
- Recent activity (1h, 6h)
- Magnitude distribution

### Charts
- 7-day trend with average/max magnitude
- 24-hour activity patterns
- Magnitude distribution breakdown
- Live updates every 25 seconds

## System Components

### Earthquake Producer
- Polls USGS API every 60 seconds
- Duplicate detection and filtering
- Kafka topic: `earthquakes_raw`
- Processes ~2,000-4,000 events/day

### Earthquake Consumer
- Kafka consumer processing events
- Stores raw data in PostgreSQL
- Calculates KPIs every 25 seconds
- WebSocket broadcasting

### API Server
- REST endpoints for historical data
- WebSocket server for real-time updates
- Data type conversion for frontend

### Dashboard
- React + TypeScript frontend
- Real-time WebSocket integration
- Chart.js visualizations
- Apache reverse proxy

## Database Schema

### Earthquakes
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

### Daily KPIs
```sql
CREATE TABLE kpi_quake_daily (
  day             DATE PRIMARY KEY,
  total_count     INT,
  avg_mag         NUMERIC(4,2),
  max_mag         NUMERIC(4,1),
  big_quakes      INT,
  avg_depth       NUMERIC(5,1),
  max_depth       NUMERIC(5,1),
  shallow_count   INT,
  mag_0_1         INT,
  mag_1_2         INT,
  mag_2_3         INT,
  mag_3_4         INT,
  mag_4_5         INT,
  last_hour_count INT,
  last_6h_count   INT
);
```

### Hourly KPIs
```sql
CREATE TABLE kpi_quake_hourly (
  hour_start    TIMESTAMPTZ PRIMARY KEY,
  total_count   INT,
  avg_mag       NUMERIC(4,2),
  max_mag       NUMERIC(4,1),
  avg_depth     NUMERIC(5,1),
  max_depth     NUMERIC(5,1),
  shallow_count INT,
  mag_0_1       INT,
  mag_1_2       INT,
  mag_2_3       INT,
  mag_3_4       INT,
  mag_4_5       INT,
  mag_5_plus    INT
);
```

## Development

### Building
```bash
# Compile TypeScript
cd producer && npx tsc
cd api && npx tsc

# Build dashboard
cd dashboard && npm run build

# Rebuild containers
docker-compose build
```

### Monitoring
```bash
# View logs
docker-compose logs -f earthquake-producer
docker-compose logs -f earthquake-consumer

# Database check
docker-compose exec postgres psql -U scs -d scs -c "SELECT COUNT(*) FROM earthquakes;"

# API test
curl http://localhost:4000/api/quakes/kpis?days=7
```

## Performance

- **Data Volume**: ~2,000-4,000 earthquakes/day
- **API Latency**: <100ms for queries
- **Updates**: Every 25 seconds
- **Memory**: ~500MB total
- **Storage**: ~1MB/day

## Data Source

USGS Earthquake Hazards Program
- URL: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson
- Frequency: Every minute
- Coverage: Global
- Format: GeoJSON

## Production Setup

- Add API authentication
- Implement rate limiting
- Configure monitoring
- Set up log aggregation
- Add SSL/TLS
- Data retention policies
- Backup and recovery

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `docker-compose up -d`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with**: TypeScript, React, Node.js, PostgreSQL, Kafka, Docker, Apache, Chart.js 