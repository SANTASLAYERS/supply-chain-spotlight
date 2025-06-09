export interface KpiPayload {
  ts: string;           // ISO timestamp of flush
  day: string;          // YYYY-MM-DD
  avgLead: number;
  onTimePct: number;
  lateCount: number;
  totalCount: number;
} 