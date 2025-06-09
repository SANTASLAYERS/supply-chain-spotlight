import axios from "axios";
import { Kafka } from "kafkajs";

const FEED = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson";
const kafka = new Kafka({ brokers: ["kafka:9092"] }).producer();
const seen = new Set<string>();           // quake IDs we already forwarded

async function poll() {
  try {
    console.log("Polling USGS earthquake feed...");
    const { data } = await axios.get(FEED);
    let newQuakes = 0;
    
    for (const f of data.features) {
      const id = f.id;
      if (seen.has(id)) continue;
      seen.add(id);
      newQuakes++;

      const p = f.properties;
      const [lon, lat, depth] = f.geometry.coordinates;

      await kafka.send({
        topic: "earthquakes_raw",
        messages: [{
          key: id,
          value: JSON.stringify({
            id,
            mag: p.mag,
            place: p.place,
            time: new Date(p.time).toISOString(),
            updated: new Date(p.updated).toISOString(),
            lat, lon, depth
          })
        }]
      });
    }
    
    console.log(`Processed ${newQuakes} new earthquakes out of ${data.features.length} total`);
  } catch (error) {
    console.error("Error polling earthquake feed:", error);
  }
}

(async () => {
  console.log("Starting earthquake producer...");
  await kafka.connect();
  console.log("Connected to Kafka");
  
  // Poll immediately on startup
  await poll();
  
  // Then poll every 60 seconds
  setInterval(poll, 30_000);
  console.log("Earthquake producer is running, polling every 60 seconds");
})(); 