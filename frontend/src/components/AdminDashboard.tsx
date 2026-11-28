
import type { CSSProperties } from "react";

type AdminUser = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_banned: boolean;
};

type AdminDashboardProps = {
  users: AdminUser[];
  loading: boolean;
  error: string;
  message: string;
  onRefresh: () => void;
  cardStyle: CSSProperties;
  buttonStyle: CSSProperties;
};

export default function AdminDashboard({
  users,
  loading,
  error,
  message,
  onRefresh,
  cardStyle,
  buttonStyle,
}: AdminDashboardProps) {
  return (
    <section style={{ ...cardStyle, marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Admin Dashboard</h2>

        <button
          onClick={onRefresh}
          style={{
            ...buttonStyle,
            background: "#e0e7ff",
            color: "#3730a3",
          }}
        >
          Refresh Users
        </button>
      </div>

      {loading && <p>Loading users...</p>}

      {error && (
        <p style={{ color: "#dc2626" }}>{error}</p>
      )}

      {message && (
        <p style={{ color: "#15803d" }}>{message}</p>
      )}

      {!loading && !error && (
        <div
          style={{
            display: "grid",
            gap: 12,
            marginTop: 18,
          }}
        >
          <h3>Registered Users ({users.length})</h3>

          {users.map((adminUser) => (
            <div
              key={adminUser.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 14,
              }}
            >
              <strong>{adminUser.full_name}</strong>

              <p
                style={{
                  margin: "6px 0",
                  color: "#64748b",
                }}
              >
                {adminUser.email}
              </p>

              <span
                style={{
                  fontSize: 13,
                  textTransform: "capitalize",
                }}
              >
                Role: {adminUser.role}
              </span>

              <span
                style={{
                  display: "block",
                  fontSize: 13,
                  marginTop: 5,
                  color: adminUser.is_banned
                    ? "#dc2626"
                    : "#15803d",
                }}
              >
                {adminUser.is_banned ? "Banned" : "Active"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
