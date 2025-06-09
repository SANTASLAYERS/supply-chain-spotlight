"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const bus_1 = require("./bus");
const app = (0, express_1.default)();
(() => __awaiter(void 0, void 0, void 0, function* () {
    const db = new pg_1.Client({
        host: "postgres",
        port: 5432,
        user: "scs",
        password: "scs",
        database: "scs",
    });
    yield db.connect();
    app.get("/api/kpis", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const days = Math.max(1, Number((_a = req.query.days) !== null && _a !== void 0 ? _a : "7"));
        const { rows } = yield db.query(`SELECT day, avg_lead_days, on_time_pct, late_count, total_count
       FROM kpi_daily
       WHERE day >= CURRENT_DATE - $1::int
       ORDER BY day`, [days - 1]);
        // Convert string values to numbers for the frontend
        const formattedRows = rows.map(row => (Object.assign(Object.assign({}, row), { avgLead: parseFloat(row.avg_lead_days), onTimePct: parseFloat(row.on_time_pct), lateCount: parseInt(row.late_count), totalCount: parseInt(row.total_count) })));
        res.json(formattedRows);
    }));
    // Enhanced Earthquake Daily KPI endpoint
    app.get("/api/quakes/kpis", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const days = Math.max(1, Number((_a = req.query.days) !== null && _a !== void 0 ? _a : "7"));
        const { rows } = yield db.query(`SELECT day, total_count, avg_mag, max_mag, big_quakes,
              avg_depth, max_depth, shallow_count,
              mag_0_1, mag_1_2, mag_2_3, mag_3_4, mag_4_5,
              last_hour_count, last_6h_count
         FROM kpi_quake_daily
         WHERE day >= CURRENT_DATE - $1::int
         ORDER BY day`, [days - 1]);
        // Convert string values to numbers for the frontend
        const formattedRows = rows.map(row => (Object.assign(Object.assign({}, row), { totalCount: parseInt(row.total_count || 0), avgMag: parseFloat(row.avg_mag || 0), maxMag: parseFloat(row.max_mag || 0), bigQuakes: parseInt(row.big_quakes || 0), avgDepth: parseFloat(row.avg_depth || 0), maxDepth: parseFloat(row.max_depth || 0), shallowCount: parseInt(row.shallow_count || 0), mag0to1: parseInt(row.mag_0_1 || 0), mag1to2: parseInt(row.mag_1_2 || 0), mag2to3: parseInt(row.mag_2_3 || 0), mag3to4: parseInt(row.mag_3_4 || 0), mag4to5: parseInt(row.mag_4_5 || 0), lastHourCount: parseInt(row.last_hour_count || 0), last6hCount: parseInt(row.last_6h_count || 0) })));
        res.json(formattedRows);
    }));
    // New Earthquake Hourly KPI endpoint
    app.get("/api/quakes/kpis/hourly", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const hours = Math.max(1, Number((_a = req.query.hours) !== null && _a !== void 0 ? _a : "24"));
        const { rows } = yield db.query(`SELECT hour_start, total_count, avg_mag, max_mag,
              avg_depth, max_depth, shallow_count,
              mag_0_1, mag_1_2, mag_2_3, mag_3_4, mag_4_5, mag_5_plus
         FROM kpi_quake_hourly
         WHERE hour_start >= NOW() - INTERVAL '${hours} hours'
         ORDER BY hour_start`);
        // Convert string values to numbers for the frontend
        const formattedRows = rows.map(row => (Object.assign(Object.assign({}, row), { totalCount: parseInt(row.total_count || 0), avgMag: parseFloat(row.avg_mag || 0), maxMag: parseFloat(row.max_mag || 0), avgDepth: parseFloat(row.avg_depth || 0), maxDepth: parseFloat(row.max_depth || 0), shallowCount: parseInt(row.shallow_count || 0), mag0to1: parseInt(row.mag_0_1 || 0), mag1to2: parseInt(row.mag_1_2 || 0), mag2to3: parseInt(row.mag_2_3 || 0), mag3to4: parseInt(row.mag_3_4 || 0), mag4to5: parseInt(row.mag_4_5 || 0), mag5plus: parseInt(row.mag_5_plus || 0) })));
        res.json(formattedRows);
    }));
    app.get("/healthz", (_, res) => {
        res.json({ ok: true });
    });
    // --- wrap Express in a plain HTTP server so WS can attach ---
    const server = http_1.default.createServer(app);
    const wss = new ws_1.WebSocketServer({ server, path: "/ws" });
    wss.on("connection", (socket) => {
        console.log("WS client connected, total =", wss.clients.size);
        /* push the most recent snapshot immediately (optional)
           – easiest is to query kpi_daily for today and send once */
        socket.on("close", () => console.log("WS client closed, total =", wss.clients.size));
    });
    /* broadcast helper for supply chain KPIs */
    bus_1.bus.on(bus_1.KPI_EVENT, (data) => {
        const payload = JSON.stringify({ type: 'kpi', data });
        wss.clients.forEach((ws) => ws.readyState === ws.OPEN && ws.send(payload));
    });
    /* broadcast helper for earthquake daily KPIs */
    bus_1.bus.on(bus_1.QUAKE_KPI_EVENT, (data) => {
        const payload = JSON.stringify({ type: 'quake_kpi', data });
        wss.clients.forEach((ws) => ws.readyState === ws.OPEN && ws.send(payload));
    });
    /* broadcast helper for earthquake hourly KPIs */
    bus_1.bus.on(bus_1.QUAKE_HOURLY_KPI_EVENT, (data) => {
        const payload = JSON.stringify({ type: 'quake_hourly_kpi', data });
        wss.clients.forEach((ws) => ws.readyState === ws.OPEN && ws.send(payload));
    });
    server.listen(4000, () => console.log("Enhanced API+WS listening on :4000"));
}))();
