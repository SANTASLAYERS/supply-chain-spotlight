import express from "express";
import { Client } from "pg";
import http from "http";
import { WebSocketServer } from "ws";
import { bus, KPI_EVENT, KpiPayload, QUAKE_KPI_EVENT, QuakeKpiPayload, QUAKE_HOURLY_KPI_EVENT, QuakeHourlyKpiPayload } from "./bus";

const app = express();

(async () => {
  const db = new Client({
    host: "postgres",
    port: 5432,
    user: "scs",
    password: "scs",
    database: "scs",
  });
  await db.connect();

  app.get("/api/kpis", async (req, res) => {
    const days = Math.max(1, Number(req.query.days ?? "7"));
    const { rows } = await db.query(
      `SELECT day, avg_lead_days, on_time_pct, late_count, total_count
       FROM kpi_daily
       WHERE day >= CURRENT_DATE - $1::int
       ORDER BY day`,
      [days - 1]
    );
    
    const formattedRows = rows.map(row => ({
      ...row,
      avgLead: parseFloat(row.avg_lead_days),
      onTimePct: parseFloat(row.on_time_pct),
      lateCount: parseInt(row.late_count),
      totalCount: parseInt(row.total_count)
    }));
    
    res.json(formattedRows);
  });

  app.get("/api/quakes/kpis", async (req, res) => {
    const days = Math.max(1, Number(req.query.days ?? "7"));
    const { rows } = await db.query(
      `SELECT day, total_count, avg_mag, max_mag, big_quakes,
              avg_depth, max_depth, shallow_count,
              mag_0_1, mag_1_2, mag_2_3, mag_3_4, mag_4_5,
              last_hour_count, last_6h_count
         FROM kpi_quake_daily
         WHERE day >= CURRENT_DATE - $1::int
         ORDER BY day`, 
      [days - 1]
    );
    
    const formattedRows = rows.map(row => ({
      ...row,
      totalCount: parseInt(row.total_count || 0),
      avgMag: parseFloat(row.avg_mag || 0),
      maxMag: parseFloat(row.max_mag || 0),
      bigQuakes: parseInt(row.big_quakes || 0),
      avgDepth: parseFloat(row.avg_depth || 0),
      maxDepth: parseFloat(row.max_depth || 0),
      shallowCount: parseInt(row.shallow_count || 0),
      mag0to1: parseInt(row.mag_0_1 || 0),
      mag1to2: parseInt(row.mag_1_2 || 0),
      mag2to3: parseInt(row.mag_2_3 || 0),
      mag3to4: parseInt(row.mag_3_4 || 0),
      mag4to5: parseInt(row.mag_4_5 || 0),
      lastHourCount: parseInt(row.last_hour_count || 0),
      last6hCount: parseInt(row.last_6h_count || 0)
    }));
    
    res.json(formattedRows);
  });

  app.get("/api/quakes/kpis/hourly", async (req, res) => {
    const hours = Math.max(1, Number(req.query.hours ?? "24"));
    const { rows } = await db.query(
      `SELECT hour_start, total_count, avg_mag, max_mag,
              avg_depth, max_depth, shallow_count,
              mag_0_1, mag_1_2, mag_2_3, mag_3_4, mag_4_5, mag_5_plus
         FROM kpi_quake_hourly
         WHERE hour_start >= NOW() - INTERVAL '${hours} hours'
         ORDER BY hour_start`
    );
    
    const formattedRows = rows.map(row => ({
      ...row,
      totalCount: parseInt(row.total_count || 0),
      avgMag: parseFloat(row.avg_mag || 0),
      maxMag: parseFloat(row.max_mag || 0),
      avgDepth: parseFloat(row.avg_depth || 0),
      maxDepth: parseFloat(row.max_depth || 0),
      shallowCount: parseInt(row.shallow_count || 0),
      mag0to1: parseInt(row.mag_0_1 || 0),
      mag1to2: parseInt(row.mag_1_2 || 0),
      mag2to3: parseInt(row.mag_2_3 || 0),
      mag3to4: parseInt(row.mag_3_4 || 0),
      mag4to5: parseInt(row.mag_4_5 || 0),
      mag5plus: parseInt(row.mag_5_plus || 0)
    }));
    
    res.json(formattedRows);
  });

  app.get("/healthz", (_, res) => {
    res.json({ ok: true });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket) => {
    console.log("WS client connected, total =", wss.clients.size);

    socket.on("close", () =>
      console.log("WS client closed, total =", wss.clients.size)
    );
  });

  bus.on(KPI_EVENT, (data: KpiPayload) => {
    const payload = JSON.stringify({ type: 'kpi', data });
    wss.clients.forEach((ws) => ws.readyState === ws.OPEN && ws.send(payload));
  });

  bus.on(QUAKE_KPI_EVENT, (data: QuakeKpiPayload) => {
    const payload = JSON.stringify({ type: 'quake_kpi', data });
    wss.clients.forEach((ws) => ws.readyState === ws.OPEN && ws.send(payload));
  });

  bus.on(QUAKE_HOURLY_KPI_EVENT, (data: QuakeHourlyKpiPayload) => {
    const payload = JSON.stringify({ type: 'quake_hourly_kpi', data });
    wss.clients.forEach((ws) => ws.readyState === ws.OPEN && ws.send(payload));
  });

  server.listen(4000, () => console.log("API+WS listening on :4000"));
})();
