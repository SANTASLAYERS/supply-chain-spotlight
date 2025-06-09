import type { QuakeKpiPayload } from "../types";
import "./QuakeKpiTiles.css";

interface Props {
  latest?: QuakeKpiPayload;
}

export function QuakeKpiTiles({ latest }: Props) {
  if (!latest) {
    return (
      <div className="kpi-tiles">
        <div className="kpi-tile">Loading earthquake data...</div>
      </div>
    );
  }

  return (
    <div className="kpi-tiles-container">
      <h2>Daily Summary</h2>
      
      {/* Primary Metrics */}
      <div className="kpi-tiles primary">
        <div className="kpi-tile">
          <div className="kpi-label">Total Earthquakes</div>
          <div className="kpi-value">{latest.totalCount}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Average Magnitude</div>
          <div className="kpi-value">{latest.avgMag.toFixed(2)}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Max Magnitude</div>
          <div className="kpi-value">{latest.maxMag.toFixed(1)}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Major Quakes (≥5.0)</div>
          <div className="kpi-value">{latest.bigQuakes}</div>
        </div>
      </div>

      {/* Depth Analysis */}
      <div className="kpi-tiles secondary">
        <div className="kpi-tile">
          <div className="kpi-label">Average Depth</div>
          <div className="kpi-value">{latest.avgDepth?.toFixed(1) || 'N/A'} km</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Max Depth</div>
          <div className="kpi-value">{latest.maxDepth?.toFixed(1) || 'N/A'} km</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Shallow Quakes (&lt;10km)</div>
          <div className="kpi-value">{latest.shallowCount || 0}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Recent Activity (6h)</div>
          <div className="kpi-value">{latest.last6hCount || 0}</div>
        </div>
      </div>
    </div>
  );
} 