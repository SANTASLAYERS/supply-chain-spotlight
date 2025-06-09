import type { KpiPayload } from "../types";
import "./KpiTiles.css";

type Props = { latest: KpiPayload | null };

export default function KpiTiles({ latest }: Props) {
  if (!latest) return <p>Loading …</p>;
  return (
    <div className="tiles">
      <Tile label="Total Shipments" value={latest.totalCount} />
      <Tile label="On-Time %" value={latest.onTimePct.toFixed(1)} />
      <Tile label="Late" value={latest.lateCount} />
      <Tile label="Avg Lead (days)" value={latest.avgLead.toFixed(2)} />
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="tile">
      <span className="value">{value}</span>
      <span className="label">{label}</span>
    </div>
  );
} 