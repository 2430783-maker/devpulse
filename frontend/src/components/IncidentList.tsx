
import type { Incident } from "../types/incident";

interface IncidentListProps {
  incidents: Incident[];
  loading: boolean;
  onRefresh: () => void;
  onView: (id: number) => void;
  onEdit: (incident: Incident) => void;
  onDelete: (id: number) => void;
}

export default function IncidentList({
  incidents,
  loading,
  onRefresh,
  onView,
  onEdit,
  onDelete,
}: IncidentListProps) {
  const card: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 20,
  };

  const buttonStyle: React.CSSProperties = {
    padding: "10px 16px",
    border: 0,
    borderRadius: 7,
    cursor: "pointer",
    fontWeight: 600,
  };

  return (
    <section>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Incidents ({incidents.length})</h2>

        <button
          onClick={onRefresh}
          style={{
            ...buttonStyle,
            background: "#e0e7ff",
            color: "#3730a3",
          }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading incidents...</p>
      ) : incidents.length === 0 ? (
        <div style={card}>
          No incidents found. Create your first one above.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {incidents.map((incident) => (
            <article key={incident.id} style={card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 8px" }}>
                    #{incident.id} — {incident.title}
                  </h3>

                  <p style={{ color: "#64748b", margin: "0 0 12px" }}>
                    {incident.description}
                  </p>

                  <span style={{ fontSize: 13, color: "#475569" }}>
                    Severity: <b>{incident.severity}</b>
                    {" · "}
                    Status: <b>{incident.status}</b>
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <button
                    style={{
                      ...buttonStyle,
                      background: "#e0e7ff",
                      color: "#3730a3",
                    }}
                    onClick={() => onView(incident.id)}
                  >
                    View
                  </button>

                  <button
                    style={{
                      ...buttonStyle,
                      background: "#e0e7ff",
                      color: "#3730a3",
                    }}
                    onClick={() => onEdit(incident)}
                  >
                    Edit
                  </button>

                  <button
                    style={{
                      ...buttonStyle,
                      background: "#fee2e2",
                      color: "#991b1b",
                    }}
                    onClick={() => onDelete(incident.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
