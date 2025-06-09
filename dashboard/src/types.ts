export interface KpiPayload {
  ts: string;           // ISO timestamp of flush
  day: string;          // YYYY-MM-DD
  avgLead: number;
  onTimePct: number;
  lateCount: number;
  totalCount: number;
}

// Enhanced Earthquake KPI payload
export interface QuakeKpiPayload {
  ts: string;           // ISO timestamp of flush
  day: string;          // YYYY-MM-DD
  totalCount: number;
  avgMag: number;
  maxMag: number;
  bigQuakes: number;    // count of mag >= 5.0
  // Enhanced metrics
  avgDepth: number;
  maxDepth: number;
  shallowCount: number; // depth < 10km
  mag0to1: number;
  mag1to2: number;
  mag2to3: number;
  mag3to4: number;
  mag4to5: number;
  lastHourCount: number;
  last6hCount: number;
}

// Hourly Earthquake KPI payload
export interface QuakeHourlyKpiPayload {
  ts: string;           // ISO timestamp of flush
  hour: string;         // YYYY-MM-DD HH:00:00
  totalCount: number;
  avgMag: number;
  maxMag: number;
  avgDepth: number;
  maxDepth: number;
  shallowCount: number;
  mag0to1: number;
  mag1to2: number;
  mag2to3: number;
  mag3to4: number;
  mag4to5: number;
  mag5plus: number;
} 