import { Kafka } from "kafkajs";

const kafka = new Kafka({ brokers: ["localhost:9092"] });
const producer = kafka.producer();

async function run() {
  await producer.connect();
  setInterval(async () => {
    const payload = {
      orderId: Math.random().toString(36).slice(2),
      status: "IN_TRANSIT",
      eta: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
      ts: new Date().toISOString(),
    };
    await producer.send({
      topic: "shipments_raw",
      messages: [{ value: JSON.stringify(payload) }],
    });
    console.log("sent", payload);
  }, 10_000);
}

run().catch(console.error);
