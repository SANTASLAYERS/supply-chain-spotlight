import { useEffect, useState } from "react";
import { fetchQuakeKpis, fetchQuakeHourlyKpis, openKpiStream } from "./api";
import type { QuakeKpiPayload, QuakeHourlyKpiPayload } from "./types";
import { QuakeKpiTiles } from "./components/QuakeKpiTiles";
import { QuakeTrendChart } from "./components/QuakeTrendChart";
import { QuakeHourlyChart } from "./components/QuakeHourlyChart";
import { QuakeMagnitudeDistribution } from "./components/QuakeMagnitudeDistribution";
import "./App.css";

export default function EarthquakeApp() {
  const [dailyHistory, setDailyHistory] = useState<QuakeKpiPayload[]>([]);
  const [hourlyHistory, setHourlyHistory] = useState<QuakeHourlyKpiPayload[]>([]);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  
  const latestDaily = dailyHistory[dailyHistory.length - 1] ?? null;

  useEffect(() => {
    let ws: WebSocket | null = null;
    
    (async () => {
      try {
        // Fetch initial earthquake data
        const [daily, hourly] = await Promise.all([
          fetchQuakeKpis(7),
          fetchQuakeHourlyKpis(24)
        ]);
        
        setDailyHistory(daily);
        setHourlyHistory(hourly);
        
        // Open WebSocket connection for earthquake updates
        ws = openKpiStream(
          () => {}, // ignore supply chain updates
          (p) => {  // handle daily earthquake updates
            setDailyHistory((prev) => {
              const idx = prev.findIndex(d => d.day === p.day);
              if (idx >= 0) {          // replace
                const copy = [...prev];
                copy[idx] = p;
                return copy;
              }
              return [...prev, p];     // append new day
            });
          },
          (p) => {  // handle hourly earthquake updates
            setHourlyHistory((prev) => {
              const idx = prev.findIndex(d => d.hour === p.hour);
              if (idx >= 0) {          // replace
                const copy = [...prev];
                copy[idx] = p;
                return copy;
              }
              return [...prev, p];     // append new hour
            });
          }
        );
        
        ws.onopen = () => setWsStatus("connected");
        ws.onclose = () => setWsStatus("disconnected");
        ws.onerror = () => setWsStatus("disconnected");
        
      } catch (error) {
        console.error("Failed to fetch initial earthquake data:", error);
        setWsStatus("disconnected");
      }
    })();
    
    return () => {
      if (ws) ws.close();
    };
  }, []);

  const getStatusText = () => {
    switch (wsStatus) {
      case "connected": return "Live Data • 25s Updates";
      case "connecting": return "Connecting...";
      case "disconnected": return "Connection Lost";
      default: return "Status Unknown";
    }
  };

  return (
    <main>
      <header>
        <h1>Earthquake Monitor</h1>
        <div className={`ws-status ${wsStatus}`}>
          {getStatusText()}
        </div>
      </header>
      
      {/* Daily Summary KPI Tiles */}
      <QuakeKpiTiles latest={latestDaily} />
      
      {/* Expanded Charts Section */}
      <div className="charts-container">
        {/* 7-Day Trend - Full Width */}
        {dailyHistory.length > 0 && (
          <div className="chart-section">
            <QuakeTrendChart data={dailyHistory} />
          </div>
        )}
        
        {/* 24-Hour Activity - Full Width */}
        {hourlyHistory.length > 0 && (
          <div className="chart-section">
            <QuakeHourlyChart data={hourlyHistory} />
          </div>
        )}
      </div>
      
      {/* Analysis Section */}
      <div className="analysis-container">
        {/* Magnitude Distribution */}
        {latestDaily && (
          <div className="analysis-section">
            <QuakeMagnitudeDistribution data={latestDaily} />
          </div>
        )}
      </div>
    </main>
  );
} 