import { useEffect, useState, type FormEvent } from "react";

import IncidentForm from "./components/IncidentForm";
import IncidentList from "./components/IncidentList";
import IncidentDetails from "./components/IncidentDetails";

import {
  getIncidents,
  getIncident,
  createIncident,
  updateIncident,
  deleteIncident,
} from "./services/api";

import {
  emptyIncidentForm,
  type Incident,
  type IncidentFormData,
} from "./types/incident";

export default function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [form, setForm] = useState<IncidentFormData>(emptyIncidentForm);
  const [editing, setEditing] = useState<number | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadIncidents() {
    try {
      const data = await getIncidents();
      setIncidents(data);
    } catch {
      setMessage("Unable to connect to the API. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIncidents();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    try {
      if (editing !== null) {
        await updateIncident(editing, form);
        setMessage("Incident updated!");
      } else {
        await createIncident(form);
        setMessage("Incident created!");
      }

      setForm(emptyIncidentForm);
      setEditing(null);
      await loadIncidents();
    } catch {
      setMessage("Action failed. Please try again.");
    }
  }

  async function handleView(id: number) {
    setMessage("");

    try {
      const data = await getIncident(id);
      setSelectedIncident(data);
    } catch {
      setMessage("Could not load incident details.");
    }
  }

  function startEdit(incident: Incident) {
    setEditing(incident.id);
    setSelectedIncident(null);

    setForm({
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      status: incident.status,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this incident?")) return;

    try {
      await deleteIncident(id);

      if (selectedIncident?.id === id) {
        setSelectedIncident(null);
      }

      setMessage("Incident deleted.");
      await loadIncidents();
    } catch {
      setMessage("Could not delete incident.");
    }
  }

  function cancelEdit() {
    setEditing(null);
    setForm(emptyIncidentForm);
  }

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "#f4f6fb",
    color: "#172033",
    fontFamily: "Arial, sans-serif",
    padding: "32px 18px",
  };

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 1000, margin: "auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 30 }}>DevPulse</h1>
            <p style={{ color: "#64748b", marginBottom: 0 }}>
              Incident Management Dashboard
            </p>
          </div>

          <span
            style={{
              background: "#dcfce7",
              color: "#166534",
              padding: "8px 13px",
              borderRadius: 20,
              fontSize: 13,
            }}
          >
            ● API Connected
          </span>
        </header>

        {message && (
          <p
            style={{
              background: "#e0e7ff",
              padding: 12,
              borderRadius: 8,
            }}
          >
            {message}
          </p>
        )}

        {selectedIncident ? (
          <IncidentDetails
            incident={selectedIncident}
            onBack={() => setSelectedIncident(null)}
          />
        ) : (
          <>
            <IncidentForm
              form={form}
              setForm={setForm}
              editing={editing}
              onSubmit={handleSubmit}
              onCancel={cancelEdit}
            />

            <IncidentList
              incidents={incidents}
              loading={loading}
              onRefresh={loadIncidents}
              onView={handleView}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          </>
        )}

        <footer
          style={{
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 12,
            marginTop: 35,
          }}
        >
          DevPulse · Incident Management System
        </footer>
      </div>
    </main>
  );
}
