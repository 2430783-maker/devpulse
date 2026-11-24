
import type { Incident } from "../types/incident";

interface IncidentDetailsProps {
  incident: Incident;
  onBack: () => void;
}

export default function IncidentDetails({
  incident,
  onBack,
}: IncidentDetailsProps) {
  const card: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 24,
  };

  return (
    <section style={card}>
      <button
        onClick={onBack}
        style={{
          padding: "9px 14px",
          border: 0,
          borderRadius: 7,
          background: "#e0e7ff",
          color: "#3730a3",
          cursor: "pointer",
          fontWeight: 600,
          marginBottom: 18,
        }}
      >
        ← Back to Incidents
      </button>

      <h2 style={{ marginTop: 0 }}>
        Incident #{incident.id}: {incident.title}
      </h2>

      <p style={{ color: "#475569", lineHeight: 1.6 }}>
        {incident.description}
      </p>

      <p>
        <strong>Severity:</strong> {incident.severity}
      </p>

      <p>
        <strong>Status:</strong> {incident.status}
      </p>

      <p>
        <strong>Created:</strong> {new Date(incident.created_at).toLocaleString()}
      </p>

      <p>
        <strong>Last updated:</strong> {new Date(incident.updated_at).toLocaleString()}
      </p>
    </section>
  );
}
