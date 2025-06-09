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
// Database and Kafka setup
const kafka = new kafkajs_1.Kafka({ brokers: ["kafka:9092"] });
const consumer = kafka.consumer({ groupId: "earthquake-consumer" });
const db = new pg_1.Client({
    host: "postgres",
    port: 5432,
    user: "scs",
    password: "scs",
    database: "scs",
});
const dailyBucket = {};
const hourlyBucket = {};
function initBucket() {
    return {
        total: 0, sumMag: 0, maxMag: 0, sumDepth: 0, maxDepth: 0,
        big: 0, shallow: 0, mag0to1: 0, mag1to2: 0, mag2to3: 0,
        mag3to4: 0, mag4to5: 0, mag5plus: 0
    };
}
function updateBucket(bucket, mag, depth) {
    bucket.total += 1;
    bucket.sumMag += mag;
    bucket.sumDepth += depth;
    if (mag > bucket.maxMag)
        bucket.maxMag = mag;
    if (depth > bucket.maxDepth)
        bucket.maxDepth = depth;
    // Magnitude ranges
    if (mag >= 5.0)
        bucket.mag5plus += 1;
    else if (mag >= 4.0)
        bucket.mag4to5 += 1;
    else if (mag >= 3.0)
        bucket.mag3to4 += 1;
    else if (mag >= 2.0)
        bucket.mag2to3 += 1;
    else if (mag >= 1.0)
        bucket.mag1to2 += 1;
    else
        bucket.mag0to1 += 1;
    // Special counts
    if (mag >= 5.0)
        bucket.big += 1;
    if (depth < 10)
        bucket.shallow += 1;
}
function getTodaysTotalCount() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield db.query(`SELECT COUNT(*) FROM earthquakes WHERE DATE(time) = CURRENT_DATE`);
            return parseInt(result.rows[0].count);
        }
        catch (error) {
            console.error("Error getting today's total count:", error);
            return 0;
        }
    });
}
function getRecentCounts(day) {
    return __awaiter(this, void 0, void 0, function* () {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        try {
            const lastHourResult = yield db.query(`SELECT COUNT(*) FROM earthquakes WHERE time >= $1`, [oneHourAgo.toISOString()]);
            const last6hResult = yield db.query(`SELECT COUNT(*) FROM earthquakes WHERE time >= $1`, [sixHoursAgo.toISOString()]);
            return {
                lastHour: parseInt(lastHourResult.rows[0].count),
                last6h: parseInt(last6hResult.rows[0].count)
            };
        }
        catch (error) {
            console.error("Error getting recent counts:", error);
            return { lastHour: 0, last6h: 0 };
        }
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Starting enhanced earthquake consumer...");
        yield db.connect();
        yield consumer.connect();
        yield consumer.subscribe({ topic: "earthquakes_raw", fromBeginning: true });
        yield consumer.run({
            eachMessage: (_a) => __awaiter(this, [_a], void 0, function* ({ message }) {
                var _b, _c;
                if (!message.value)
                    return;
                const e = JSON.parse(message.value.toString());
                // Store raw earthquake event
                try {
                    yield db.query(`INSERT INTO earthquakes
             (id, mag, place, time, updated, lat, lon, depth_km)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT DO NOTHING`, [e.id, e.mag, e.place, e.time, e.updated, e.lat, e.lon, e.depth]);
                }
                catch (error) {
                    console.error("Error inserting earthquake:", error);
                    return;
                }
                const mag = e.mag || 0;
                const depth = e.depth || 0;
                // Update daily bucket
                const day = (0, dayjs_1.default)(e.time).format("YYYY-MM-DD");
                (_b = dailyBucket[day]) !== null && _b !== void 0 ? _b : (dailyBucket[day] = initBucket());
                updateBucket(dailyBucket[day], mag, depth);
                // Update hourly bucket
                const hour = (0, dayjs_1.default)(e.time).format("YYYY-MM-DD HH:00:00");
                (_c = hourlyBucket[hour]) !== null && _c !== void 0 ? _c : (hourlyBucket[hour] = initBucket());
                updateBucket(hourlyBucket[hour], mag, depth);
                console.log(`Processed earthquake ${e.id}: mag ${mag} at ${e.place}`);
            }),
        });
    });
}
// Enhanced KPI flush every 25 seconds
setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
    const today = (0, dayjs_1.default)().format("YYYY-MM-DD");
    const currentHour = (0, dayjs_1.default)().format("YYYY-MM-DD HH:00:00");
    // Flush daily KPIs
    const dailyData = dailyBucket[today];
    if (dailyData && dailyData.total > 0) {
        const avgMag = dailyData.sumMag / dailyData.total;
        const avgDepth = dailyData.sumDepth / dailyData.total;
        const recentCounts = yield getRecentCounts(today);
        const actualTotalCount = yield getTodaysTotalCount(); // Use database count
        try {
            yield db.query(`INSERT INTO kpi_quake_daily(
          day, total_count, avg_mag, max_mag, big_quakes,
          avg_depth, max_depth, shallow_count,
          mag_0_1, mag_1_2, mag_2_3, mag_3_4, mag_4_5,
          last_hour_count, last_6h_count
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (day) DO UPDATE SET
          total_count=$2, avg_mag=$3, max_mag=$4, big_quakes=$5,
          avg_depth=$6, max_depth=$7, shallow_count=$8,
          mag_0_1=$9, mag_1_2=$10, mag_2_3=$11, mag_3_4=$12, mag_4_5=$13,
          last_hour_count=$14, last_6h_count=$15`, [
                today, actualTotalCount, avgMag, dailyData.maxMag, dailyData.big,
                avgDepth, dailyData.maxDepth, dailyData.shallow,
                dailyData.mag0to1, dailyData.mag1to2, dailyData.mag2to3,
                dailyData.mag3to4, dailyData.mag4to5,
                recentCounts.lastHour, recentCounts.last6h
            ]);
            // Emit daily WebSocket event
            const dailyPayload = {
                ts: new Date().toISOString(),
                day: today,
                totalCount: actualTotalCount, // Use database count
                avgMag,
                maxMag: dailyData.maxMag,
                bigQuakes: dailyData.big,
                avgDepth,
                maxDepth: dailyData.maxDepth,
                shallowCount: dailyData.shallow,
                mag0to1: dailyData.mag0to1,
                mag1to2: dailyData.mag1to2,
                mag2to3: dailyData.mag2to3,
                mag3to4: dailyData.mag3to4,
                mag4to5: dailyData.mag4to5,
                lastHourCount: recentCounts.lastHour,
                last6hCount: recentCounts.last6h,
            };
            bus_1.bus.emit(bus_1.QUAKE_KPI_EVENT, dailyPayload);
            console.log(`Daily KPI flushed ${today}: ${actualTotalCount} quakes, avg mag: ${avgMag.toFixed(2)}, avg depth: ${avgDepth.toFixed(1)}km`);
        }
        catch (error) {
            console.error("Error flushing daily KPIs:", error);
        }
    }
    // Flush hourly KPIs
    const hourlyData = hourlyBucket[currentHour];
    if (hourlyData && hourlyData.total > 0) {
        const avgMag = hourlyData.sumMag / hourlyData.total;
        const avgDepth = hourlyData.sumDepth / hourlyData.total;
        try {
            yield db.query(`INSERT INTO kpi_quake_hourly(
          hour_start, total_count, avg_mag, max_mag,
          avg_depth, max_depth, shallow_count,
          mag_0_1, mag_1_2, mag_2_3, mag_3_4, mag_4_5, mag_5_plus
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (hour_start) DO UPDATE SET
          total_count=$2, avg_mag=$3, max_mag=$4,
          avg_depth=$5, max_depth=$6, shallow_count=$7,
          mag_0_1=$8, mag_1_2=$9, mag_2_3=$10, mag_3_4=$11, mag_4_5=$12, mag_5_plus=$13`, [
                currentHour, hourlyData.total, avgMag, hourlyData.maxMag,
                avgDepth, hourlyData.maxDepth, hourlyData.shallow,
                hourlyData.mag0to1, hourlyData.mag1to2, hourlyData.mag2to3,
                hourlyData.mag3to4, hourlyData.mag4to5, hourlyData.mag5plus
            ]);
            // Emit hourly WebSocket event
            const hourlyPayload = {
                ts: new Date().toISOString(),
                hour: currentHour,
                totalCount: hourlyData.total,
                avgMag,
                maxMag: hourlyData.maxMag,
                avgDepth,
                maxDepth: hourlyData.maxDepth,
                shallowCount: hourlyData.shallow,
                mag0to1: hourlyData.mag0to1,
                mag1to2: hourlyData.mag1to2,
                mag2to3: hourlyData.mag2to3,
                mag3to4: hourlyData.mag3to4,
                mag4to5: hourlyData.mag4to5,
                mag5plus: hourlyData.mag5plus,
            };
            bus_1.bus.emit(bus_1.QUAKE_HOURLY_KPI_EVENT, hourlyPayload);
            console.log(`Hourly KPI flushed ${currentHour}: ${hourlyData.total} quakes`);
        }
        catch (error) {
            console.error("Error flushing hourly KPIs:", error);
        }
    }
}), 25000); // 25 seconds instead of 60
run().catch(console.error);
