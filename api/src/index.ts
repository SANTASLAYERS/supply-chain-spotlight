import { Kafka } from "kafkajs";
import { Client } from "pg";
import dayjs from "dayjs";
import { bus, KPI_EVENT, KpiPayload } from "./bus";

// ----- existing setup (unchanged) -----
const kafka = new Kafka({ brokers: ["kafka:9092"] });
const consumer = kafka.consumer({ groupId: "scs-consumer" });
const db = new Client({
  host: "postgres",
  port: 5432,
  user: "scs",
  password: "scs",
  database: "scs",
});

// ---------------- KPI bucket ----------------
type DayKey = string;
interface Totals {
  total: number;
  late: number;
  leadSum: number;
}
const bucket: Record<DayKey, Totals> = {};

// helper
function diffDays(a: string, b: string) {
  return dayjs(a).diff(dayjs(b), "hour") / 24;
}

// ---------------- MAIN ----------------
async function run() {
  await db.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: "shipments_raw", fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const e = JSON.parse(message.value.toString());

      // 1️⃣ Ensure order exists
      await db.query(
        `INSERT INTO orders (order_id, created_at)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [e.orderId, e.ts]
      );

      // 2️⃣ Insert shipment row
      await db.query(
        `INSERT INTO shipments (order_id, status, eta, location, event_time)
         VALUES ($1, $2, $3, $4, $5)`,
        [e.orderId, e.status, e.eta, e.location ?? "UNK", e.ts]
      );

      // 3️⃣ Update KPI bucket
      const day = dayjs(e.ts).format("YYYY-MM-DD");
      bucket[day] ??= { total: 0, late: 0, leadSum: 0 };
      const b = bucket[day];

      b.total += 1;
      if (e.eta && e.status === "DELIVERED" && dayjs(e.ts).isAfter(e.eta)) b.late += 1;
      if (e.eta) b.leadSum += diffDays(e.eta, e.ts);
    },
  });
}

// 4️⃣ Flush KPI bucket to DB every 60s
setInterval(async () => {
  const today = dayjs().format("YYYY-MM-DD");
  const b = bucket[today];
  if (!b || b.total === 0) return;

  const avgLead = b.leadSum / b.total;
  const onTimePct = ((b.total - b.late) / b.total) * 100;

  await db.query(
    `INSERT INTO kpi_daily (day, avg_lead_days, on_time_pct, late_count, total_count)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (day)
     DO UPDATE SET avg_lead_days = $2, on_time_pct = $3,
                   late_count = $4, total_count = $5`,
    [today, avgLead, onTimePct, b.late, b.total]
  );
  
  const wsPayload: KpiPayload = {
    ts: new Date().toISOString(),
    day: today,
    avgLead,
    onTimePct,
    lateCount: b.late,
    totalCount: b.total,
  };
  bus.emit(KPI_EVENT, wsPayload);
  
  console.log("KPI flushed", today, b.total);
}, 60_000);

run().catch(console.error);
