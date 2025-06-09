import { Kafka } from "kafkajs";
import { Client } from "pg";
import dayjs from "dayjs";
import { bus, QUAKE_KPI_EVENT, QuakeKpiPayload, QUAKE_HOURLY_KPI_EVENT, QuakeHourlyKpiPayload } from "./bus";

// Database and Kafka setup
const kafka = new Kafka({ brokers: ["kafka:9092"] });
const consumer = kafka.consumer({ groupId: "earthquake-consumer" });
const db = new Client({
  host: "postgres",
  port: 5432,
  user: "scs",
  password: "scs",
  database: "scs",
});

// Enhanced KPI bucket for earthquake data
type DayKey = string;
type HourKey = string;

interface EnhancedQuakeTotals {
  total: number;
  sumMag: number;
  maxMag: number;
  sumDepth: number;
  maxDepth: number;
  big: number;      // count of mag >= 5.0
  shallow: number;  // count of depth < 10km
  mag0to1: number;
  mag1to2: number;
  mag2to3: number;
  mag3to4: number;
  mag4to5: number;
  mag5plus: number;
}

const dailyBucket: Record<DayKey, EnhancedQuakeTotals> = {};
const hourlyBucket: Record<HourKey, EnhancedQuakeTotals> = {};

function initBucket(): EnhancedQuakeTotals {
  return {
    total: 0, sumMag: 0, maxMag: 0, sumDepth: 0, maxDepth: 0,
    big: 0, shallow: 0, mag0to1: 0, mag1to2: 0, mag2to3: 0,
    mag3to4: 0, mag4to5: 0, mag5plus: 0
  };
}

function updateBucket(bucket: EnhancedQuakeTotals, mag: number, depth: number) {
  bucket.total += 1;
  bucket.sumMag += mag;
  bucket.sumDepth += depth;
  if (mag > bucket.maxMag) bucket.maxMag = mag;
  if (depth > bucket.maxDepth) bucket.maxDepth = depth;
  
  // Magnitude ranges
  if (mag >= 5.0) bucket.mag5plus += 1;
  else if (mag >= 4.0) bucket.mag4to5 += 1;
  else if (mag >= 3.0) bucket.mag3to4 += 1;
  else if (mag >= 2.0) bucket.mag2to3 += 1;
  else if (mag >= 1.0) bucket.mag1to2 += 1;
  else bucket.mag0to1 += 1;
  
  // Special counts
  if (mag >= 5.0) bucket.big += 1;
  if (depth < 10) bucket.shallow += 1;
}

async function getTodaysTotalCount(): Promise<number> {
  try {
    const result = await db.query(
      `SELECT COUNT(*) FROM earthquakes WHERE DATE(time) = CURRENT_DATE`
    );
    
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error("Error getting today's total count:", error);
    return 0;
  }
}

async function getRecentCounts(day: string): Promise<{lastHour: number, last6h: number}> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  
  try {
    const lastHourResult = await db.query(
      `SELECT COUNT(*) FROM earthquakes WHERE time >= $1`,
      [oneHourAgo.toISOString()]
    );
    
    const last6hResult = await db.query(
      `SELECT COUNT(*) FROM earthquakes WHERE time >= $1`,
      [sixHoursAgo.toISOString()]
    );
    
    return {
      lastHour: parseInt(lastHourResult.rows[0].count),
      last6h: parseInt(last6hResult.rows[0].count)
    };
  } catch (error) {
    console.error("Error getting recent counts:", error);
    return { lastHour: 0, last6h: 0 };
  }
}

async function run() {
  console.log("Starting enhanced earthquake consumer...");
  await db.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: "earthquakes_raw", fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const e = JSON.parse(message.value.toString());

      // Store raw earthquake event
      try {
        await db.query(
          `INSERT INTO earthquakes
             (id, mag, place, time, updated, lat, lon, depth_km)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT DO NOTHING`,
          [e.id, e.mag, e.place, e.time, e.updated, e.lat, e.lon, e.depth]
        );
      } catch (error) {
        console.error("Error inserting earthquake:", error);
        return;
      }

      const mag = e.mag || 0;
      const depth = e.depth || 0;
      
      // Update daily bucket
      const day = dayjs(e.time).format("YYYY-MM-DD");
      dailyBucket[day] ??= initBucket();
      updateBucket(dailyBucket[day], mag, depth);
      
      // Update hourly bucket
      const hour = dayjs(e.time).format("YYYY-MM-DD HH:00:00");
      hourlyBucket[hour] ??= initBucket();
      updateBucket(hourlyBucket[hour], mag, depth);

      console.log(`Processed earthquake ${e.id}: mag ${mag} at ${e.place}`);
    },
  });
}

// Enhanced KPI flush every 25 seconds
setInterval(async () => {
  const today = dayjs().format("YYYY-MM-DD");
  const currentHour = dayjs().format("YYYY-MM-DD HH:00:00");
  
  // Flush daily KPIs
  const dailyData = dailyBucket[today];
  if (dailyData && dailyData.total > 0) {
    const avgMag = dailyData.sumMag / dailyData.total;
    const avgDepth = dailyData.sumDepth / dailyData.total;
    const recentCounts = await getRecentCounts(today);
    const actualTotalCount = await getTodaysTotalCount(); // Use database count

    try {
      await db.query(
        `INSERT INTO kpi_quake_daily(
          day, total_count, avg_mag, max_mag, big_quakes,
          avg_depth, max_depth, shallow_count,
          mag_0_1, mag_1_2, mag_2_3, mag_3_4, mag_4_5,
          last_hour_count, last_6h_count
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (day) DO UPDATE SET
          total_count=$2, avg_mag=$3, max_mag=$4, big_quakes=$5,
          avg_depth=$6, max_depth=$7, shallow_count=$8,
          mag_0_1=$9, mag_1_2=$10, mag_2_3=$11, mag_3_4=$12, mag_4_5=$13,
          last_hour_count=$14, last_6h_count=$15`,
        [
          today, actualTotalCount, avgMag, dailyData.maxMag, dailyData.big,
          avgDepth, dailyData.maxDepth, dailyData.shallow,
          dailyData.mag0to1, dailyData.mag1to2, dailyData.mag2to3, 
          dailyData.mag3to4, dailyData.mag4to5,
          recentCounts.lastHour, recentCounts.last6h
        ]
      );

      // Emit daily WebSocket event
      const dailyPayload: QuakeKpiPayload = {
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
      bus.emit(QUAKE_KPI_EVENT, dailyPayload);
      
      console.log(`Daily KPI flushed ${today}: ${actualTotalCount} quakes, avg mag: ${avgMag.toFixed(2)}, avg depth: ${avgDepth.toFixed(1)}km`);
    } catch (error) {
      console.error("Error flushing daily KPIs:", error);
    }
  }

  // Flush hourly KPIs
  const hourlyData = hourlyBucket[currentHour];
  if (hourlyData && hourlyData.total > 0) {
    const avgMag = hourlyData.sumMag / hourlyData.total;
    const avgDepth = hourlyData.sumDepth / hourlyData.total;

    try {
      await db.query(
        `INSERT INTO kpi_quake_hourly(
          hour_start, total_count, avg_mag, max_mag,
          avg_depth, max_depth, shallow_count,
          mag_0_1, mag_1_2, mag_2_3, mag_3_4, mag_4_5, mag_5_plus
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (hour_start) DO UPDATE SET
          total_count=$2, avg_mag=$3, max_mag=$4,
          avg_depth=$5, max_depth=$6, shallow_count=$7,
          mag_0_1=$8, mag_1_2=$9, mag_2_3=$10, mag_3_4=$11, mag_4_5=$12, mag_5_plus=$13`,
        [
          currentHour, hourlyData.total, avgMag, hourlyData.maxMag,
          avgDepth, hourlyData.maxDepth, hourlyData.shallow,
          hourlyData.mag0to1, hourlyData.mag1to2, hourlyData.mag2to3,
          hourlyData.mag3to4, hourlyData.mag4to5, hourlyData.mag5plus
        ]
      );

      // Emit hourly WebSocket event
      const hourlyPayload: QuakeHourlyKpiPayload = {
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
      bus.emit(QUAKE_HOURLY_KPI_EVENT, hourlyPayload);
      
      console.log(`Hourly KPI flushed ${currentHour}: ${hourlyData.total} quakes`);
    } catch (error) {
      console.error("Error flushing hourly KPIs:", error);
    }
  }
}, 25000); // 25 seconds instead of 60

run().catch(console.error); 