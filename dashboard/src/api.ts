import axios from "axios";
import type { KpiPayload, QuakeKpiPayload, QuakeHourlyKpiPayload } from "./types";

export async function fetchKpis(days = 7) {
  const { data } = await axios.get<KpiPayload[]>(
    `/api/kpis?days=${days}`
  );
  return data;
}

export async function fetchQuakeKpis(days = 7) {
  const { data } = await axios.get<QuakeKpiPayload[]>(
    `/api/quakes/kpis?days=${days}`
  );
  return data;
}

export async function fetchQuakeHourlyKpis(hours = 24) {
  const { data } = await axios.get<QuakeHourlyKpiPayload[]>(
    `/api/quakes/kpis/hourly?hours=${hours}`
  );
  return data;
}

export function openKpiStream(
  onMsg: (p: KpiPayload) => void,
  onQuakeMsg?: (p: QuakeKpiPayload) => void,
  onQuakeHourlyMsg?: (p: QuakeHourlyKpiPayload) => void
) {
  const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
  ws.onmessage = (ev) => {
    const message = JSON.parse(ev.data);
    if (message.type === 'kpi') {
      onMsg(message.data);
    } else if (message.type === 'quake_kpi' && onQuakeMsg) {
      onQuakeMsg(message.data);
    } else if (message.type === 'quake_hourly_kpi' && onQuakeHourlyMsg) {
      onQuakeHourlyMsg(message.data);
    } else {
      // Backward compatibility for old format
      onMsg(message);
    }
  };
  return ws;          // caller can close() on unmount
} 