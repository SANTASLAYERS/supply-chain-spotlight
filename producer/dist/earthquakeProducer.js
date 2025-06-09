"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const kafkajs_1 = require("kafkajs");
const FEED = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson";
const kafka = new kafkajs_1.Kafka({ brokers: ["kafka:9092"] }).producer();
const seen = new Set(); // quake IDs we already forwarded
async function poll() {
    try {
        console.log("Polling USGS earthquake feed...");
        const { data } = await axios_1.default.get(FEED);
        let newQuakes = 0;
        for (const f of data.features) {
            const id = f.id;
            if (seen.has(id))
                continue;
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
    }
    catch (error) {
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
    setInterval(poll, 60000);
    console.log("Earthquake producer is running, polling every 60 seconds");
})();
