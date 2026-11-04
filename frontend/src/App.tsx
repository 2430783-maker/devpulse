import { useEffect, useState, type FormEvent } from "react";

const API = "https://devpulse-backend-betn.onrender.com";

type Incident = {
  id: number;
  title: string;
  description: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In Progress" | "Resolved";
  created_at: string;
  updated_at: string;
};

const emptyForm = {
  title: "",
  description: "",
  severity: "Medium" as Incident["severity"],
  status: "Open" as Incident["status"],
};

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 20,
};

export default function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadIncidents() {
    try {
      const response = await fetch(`${API}/api/v1/incidents`);
      if (!response.ok) throw new Error("Could not load incidents");
      setIncidents(await response.json());
    } catch {
      setMessage("Unable to connect to the API. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIncidents();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const url = editing
      ? `${API}/api/v1/incidents/${editing}`
      : `${API}/api/v1/incidents`;

    try {
      const response = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) throw new Error("Request failed");

      setForm(emptyForm);
      setEditing(null);
      setMessage(editing ? "Incident updated!" : "Incident created!");
      await loadIncidents();
    } catch {
      setMessage("Action failed. Please try again.");
    }
  }

  function startEdit(incident: Incident) {
    setEditing(incident.id);
    setForm({
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      status: incident.status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteIncident(id: number) {
    if (!window.confirm("Delete this incident?")) return;

    try {
      const response = await fetch(`${API}/api/v1/incidents/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete failed");
      setMessage("Incident deleted.");
      await loadIncidents();
    } catch {
      setMessage("Could not delete incident.");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: 11,
    border: "1px solid #d1d5db",
    borderRadius: 7,
    marginTop: 6,
    boxSizing: "border-box",
    fontSize: 14,
  };

  const buttonStyle: React.CSSProperties = {
    padding: "10px 16px",
    border: 0,
    borderRadius: 7,
    cursor: "pointer",
    fontWeight: 600,
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f4f6fb",
      color: "#172033",
      fontFamily: "Arial, sans-serif",
      padding: "32px 18px",
    }}>
      <div style={{ maxWidth: 1000, margin: "auto" }}>
        <header style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 28,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30 }}>DevPulse</h1>
            <p style={{ color: "#64748b", marginBottom: 0 }}>
              Incident Management Dashboard
            </p>
          </div>
          <span style={{
            background: "#dcfce7",
            color: "#166534",
            padding: "8px 13px",
            borderRadius: 20,
            fontSize: 13,
          }}>● API Connected</span>
        </header>

        <section style={{ ...card, marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>
            {editing ? "Edit Incident" : "Report a New Incident"}
          </h2>

          <form onSubmit={handleSubmit}>
            <label>Title
              <input
                required
                maxLength={150}
                style={inputStyle}
                placeholder="Enter incident title"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </label>

            <label style={{ display: "block", marginTop: 14 }}>
              Description
              <textarea
                required
                style={{ ...inputStyle, minHeight: 85 }}
                placeholder="Describe the incident..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </label>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
              marginTop: 14,
            }}>
              <label>Severity
                <select
                  style={inputStyle}
                  value={form.severity}
                  onChange={e => setForm({
                    ...form,
                    severity: e.target.value as Incident["severity"],
                  })}
                >
                  {["Low", "Medium", "High", "Critical"].map(v =>
                    <option key={v}>{v}</option>
                  )}
                </select>
              </label>

              <label>Status
                <select
                  style={inputStyle}
                  value={form.status}
                  onChange={e => setForm({
                    ...form,
                    status: e.target.value as Incident["status"],
                  })}
                >
                  {["Open", "In Progress", "Resolved"].map(v =>
                    <option key={v}>{v}</option>
                  )}
                </select>
              </label>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button type="submit" style={{
                ...buttonStyle,
                background: "#4f46e5",
                color: "white",
              }}>
                {editing ? "Save Changes" : "Create Incident"}
              </button>

              {editing !== null && (
                <button type="button" style={{
                  ...buttonStyle,
                  background: "#e5e7eb",
                }} onClick={() => {
                  setEditing(null);
                  setForm(emptyForm);
                }}>Cancel</button>
              )}
            </div>
          </form>
        </section>

        {message && (
          <p style={{ background: "#e0e7ff", padding: 12, borderRadius: 8 }}>
            {message}
          </p>
        )}

        <section>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <h2>Incidents ({incidents.length})</h2>
            <button onClick={loadIncidents} style={{
              ...buttonStyle,
              background: "#e0e7ff",
              color: "#3730a3",
            }}>Refresh</button>
          </div>

          {loading ? <p>Loading incidents...</p> :
            incidents.length === 0 ? (
              <div style={card}>No incidents found. Create your first one above.</div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {incidents.map(incident => (
                  <article key={incident.id} style={card}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 10,
                    }}>
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
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button style={{
                          ...buttonStyle,
                          background: "#e0e7ff",
                          color: "#3730a3",
                        }} onClick={() => startEdit(incident)}>Edit</button>
                        <button style={{
                          ...buttonStyle,
                          background: "#fee2e2",
                          color: "#991b1b",
                        }} onClick={() => deleteIncident(incident.id)}>Delete</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
        </section>

        <footer style={{
          textAlign: "center",
          color: "#94a3b8",
          fontSize: 12,
          marginTop: 35,
        }}>
          DevPulse · Incident Management System
        </footer>
      </div>
    </main>
  );
}
