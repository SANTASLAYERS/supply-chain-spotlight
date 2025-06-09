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
    /* broadcast helper */
    bus_1.bus.on(bus_1.KPI_EVENT, (data) => {
        const payload = JSON.stringify(data);
        wss.clients.forEach((ws) => ws.readyState === ws.OPEN && ws.send(payload));
    });
    server.listen(4000, () => console.log("API+WS listening on :4000"));
}))();
