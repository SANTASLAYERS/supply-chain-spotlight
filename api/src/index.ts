import { Kafka } from "kafkajs";
import { Client } from "pg";

// 1. connect
const kafka = new Kafka({ brokers: ["localhost:9092"] });
const consumer = kafka.consumer({ groupId: "scs-consumer" });
const db = new Client({
  host: "localhost",
  port: 5432,
  user: "scs",
  password: "scs",
  database: "scs",
});

async function run() {
  await db.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: "shipments_raw", fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const ev = JSON.parse(message.value.toString());

      await db.query(
        `INSERT INTO shipments (order_id, status, eta, location, event_time)
         VALUES ($1, $2, $3, $4, $5)`,
        [ev.orderId, ev.status, ev.eta, ev.location ?? "UNK", ev.ts]
      );

      console.log("stored shipment", ev.orderId);
    },
  });
}

run().catch(console.error);
