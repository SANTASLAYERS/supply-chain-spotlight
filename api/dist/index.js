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
const kafkajs_1 = require("kafkajs");
const pg_1 = require("pg");
const dayjs_1 = __importDefault(require("dayjs"));
const bus_1 = require("./bus");
// ----- existing setup (unchanged) -----
const kafka = new kafkajs_1.Kafka({ brokers: ["kafka:9092"] });
const consumer = kafka.consumer({ groupId: "scs-consumer" });
const db = new pg_1.Client({
    host: "postgres",
    port: 5432,
    user: "scs",
    password: "scs",
    database: "scs",
});
const bucket = {};
// helper
function diffDays(a, b) {
    return (0, dayjs_1.default)(a).diff((0, dayjs_1.default)(b), "hour") / 24;
}
// ---------------- MAIN ----------------
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.connect();
        yield consumer.connect();
        yield consumer.subscribe({ topic: "shipments_raw", fromBeginning: true });
        yield consumer.run({
            eachMessage: (_a) => __awaiter(this, [_a], void 0, function* ({ message }) {
                var _b, _c;
                if (!message.value)
                    return;
                const e = JSON.parse(message.value.toString());
                // 1️⃣ Ensure order exists
                yield db.query(`INSERT INTO orders (order_id, created_at)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`, [e.orderId, e.ts]);
                // 2️⃣ Insert shipment row
                yield db.query(`INSERT INTO shipments (order_id, status, eta, location, event_time)
         VALUES ($1, $2, $3, $4, $5)`, [e.orderId, e.status, e.eta, (_b = e.location) !== null && _b !== void 0 ? _b : "UNK", e.ts]);
                // 3️⃣ Update KPI bucket
                const day = (0, dayjs_1.default)(e.ts).format("YYYY-MM-DD");
                (_c = bucket[day]) !== null && _c !== void 0 ? _c : (bucket[day] = { total: 0, late: 0, leadSum: 0 });
                const b = bucket[day];
                b.total += 1;
                if (e.eta && e.status === "DELIVERED" && (0, dayjs_1.default)(e.ts).isAfter(e.eta))
                    b.late += 1;
                if (e.eta)
                    b.leadSum += diffDays(e.eta, e.ts);
            }),
        });
    });
}
// 4️⃣ Flush KPI bucket to DB every 60s
setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
    const today = (0, dayjs_1.default)().format("YYYY-MM-DD");
    const b = bucket[today];
    if (!b || b.total === 0)
        return;
    const avgLead = b.leadSum / b.total;
    const onTimePct = ((b.total - b.late) / b.total) * 100;
    yield db.query(`INSERT INTO kpi_daily (day, avg_lead_days, on_time_pct, late_count, total_count)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (day)
     DO UPDATE SET avg_lead_days = $2, on_time_pct = $3,
                   late_count = $4, total_count = $5`, [today, avgLead, onTimePct, b.late, b.total]);
    const wsPayload = {
        ts: new Date().toISOString(),
        day: today,
        avgLead,
        onTimePct,
        lateCount: b.late,
        totalCount: b.total,
    };
    bus_1.bus.emit(bus_1.KPI_EVENT, wsPayload);
    console.log("KPI flushed", today, b.total);
}), 60000);
run().catch(console.error);
