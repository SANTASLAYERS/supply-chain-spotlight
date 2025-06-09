import { EventEmitter } from "events";
export const bus = new EventEmitter();

/*  typed helper so callers don't mistype event names  */
export type KpiPayload = {
  ts: string;           // ISO timestamp of flush
  day: string;          // YYYY-MM-DD
  avgLead: number;
  onTimePct: number;
  lateCount: number;
  totalCount: number;
};
export const KPI_EVENT = "kpi_update"; 