import axios from "axios";
import type { KpiPayload } from "./types";

export async function fetchKpis(days = 7) {
  const { data } = await axios.get<KpiPayload[]>(
    `/api/kpis?days=${days}`
  );
  return data;
}

export function openKpiStream(onMsg: (p: KpiPayload) => void) {
  const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
  ws.onmessage = (ev) => onMsg(JSON.parse(ev.data));
  return ws;          // caller can close() on unmount
} 