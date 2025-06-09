import express from "express";
import { Client } from "pg";
import http from "http";
import { WebSocketServer } from "ws";
import { bus, KPI_EVENT, KpiPayload } from "./bus";

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
    
    // Convert string values to numbers for the frontend
    const formattedRows = rows.map(row => ({
      ...row,
      avgLead: parseFloat(row.avg_lead_days),
      onTimePct: parseFloat(row.on_time_pct),
      lateCount: parseInt(row.late_count),
      totalCount: parseInt(row.total_count)
    }));
    
    res.json(formattedRows);
  });

  app.get("/healthz", (_, res) => {
    res.json({ ok: true });
  });

  // --- wrap Express in a plain HTTP server so WS can attach ---
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket) => {
    console.log("WS client connected, total =", wss.clients.size);

    /* push the most recent snapshot immediately (optional)
       – easiest is to query kpi_daily for today and send once */

    socket.on("close", () =>
      console.log("WS client closed, total =", wss.clients.size)
    );
  });

  /* broadcast helper */
  bus.on(KPI_EVENT, (data: KpiPayload) => {
    const payload = JSON.stringify(data);
    wss.clients.forEach((ws) => ws.readyState === ws.OPEN && ws.send(payload));
  });

  server.listen(4000, () => console.log("API+WS listening on :4000"));
})();
