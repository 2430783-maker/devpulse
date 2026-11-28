
import type { FormEvent } from "react";
import type { IncidentFormData } from "../types/incident";

interface IncidentFormProps {
  form: IncidentFormData;
  setForm: (form: IncidentFormData) => void;
  editing: number | null;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

export default function IncidentForm({
  form,
  setForm,
  editing,
  onSubmit,
  onCancel,
}: IncidentFormProps) {
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
    <section
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
      }}
    >
      <h2 style={{ marginTop: 0 }}>
        {editing !== null ? "Edit Incident" : "Report a New Incident"}
      </h2>

      <form onSubmit={onSubmit}>
        <label>
          Title
          <input
            required
            maxLength={150}
            style={inputStyle}
            placeholder="Enter incident title"
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
          />
        </label>

        <label style={{ display: "block", marginTop: 14 }}>
          Description
          <textarea
            required
            style={{ ...inputStyle, minHeight: 85 }}
            placeholder="Describe the incident..."
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
        </label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginTop: 14,
          }}
        >
          <label>
            Severity
            <select
              style={inputStyle}
              value={form.severity}
              onChange={(e) =>
                setForm({
                  ...form,
                  severity: e.target.value as IncidentFormData["severity"],
                })
              }
            >
              {["Low", "Medium", "High", "Critical"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select
              style={inputStyle}
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as IncidentFormData["status"],
                })
              }
            >
              {["Open", "In Progress", "Resolved"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button
            type="submit"
            style={{
              ...buttonStyle,
              background: "#4f46e5",
              color: "white",
            }}
          >
            {editing !== null ? "Save Changes" : "Create Incident"}
          </button>

          {editing !== null && (
            <button
              type="button"
              style={{
                ...buttonStyle,
                background: "#e5e7eb",
              }}
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
