import { useEffect, useState } from "react";
import { fetchKpis, openKpiStream } from "./api";
import type { KpiPayload } from "./types";
import KpiTiles from "./components/KpiTiles";
import KpiTrendChart from "./components/KpiTrendChart";
import "./App.css";

export default function App() {
  const [history, setHistory] = useState<KpiPayload[]>([]);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const latest = history[history.length - 1] ?? null;

  useEffect(() => {
    let ws: WebSocket | null = null;
    
    (async () => {
      try {
        // Fetch initial data
        const initial = await fetchKpis(7);
        setHistory(initial);
        
        // Open WebSocket connection
        ws = openKpiStream((p) => {
          setHistory((prev) => {
            const idx = prev.findIndex(d => d.day === p.day);
            if (idx >= 0) {          // replace
              const copy = [...prev];
              copy[idx] = p;
              return copy;
            }
            return [...prev, p];     // append new day
          });
        });
        
        ws.onopen = () => setWsStatus("connected");
        ws.onclose = () => setWsStatus("disconnected");
        ws.onerror = () => setWsStatus("disconnected");
        
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        setWsStatus("disconnected");
      }
    })();
    
    return () => {
      if (ws) ws.close();
    };
  }, []);

  return (
    <main>
      <header>
        <h1>Supply Chain Spotlight</h1>
        <div className={`ws-status ${wsStatus}`}>
          {wsStatus === "connected" ? "🟢 Live" : wsStatus === "connecting" ? "🟡 Connecting..." : "🔴 Disconnected"}
        </div>
      </header>
      
      <KpiTiles latest={latest} />
      <KpiTrendChart history={history} />
    </main>
  );
}
