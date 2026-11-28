
import { useState } from "react";
import type { CSSProperties } from "react";

type AdminUser = {
  id: number;
  email: string;
  full_name: string;
  role: "user" | "admin";
  is_banned: boolean;
};

type AdminDashboardProps = {
  users: AdminUser[];
  loading: boolean;
  error: string;
  message: string;
  currentUserId: number;
  actionLoadingUserId: number | null;
  onRefresh: () => void;
  onChangeRole: (userId: number, role: "user" | "admin") => void;
  onToggleBan: (userId: number, isBanned: boolean) => void;
  cardStyle: CSSProperties;
  buttonStyle: CSSProperties;
};

export default function AdminDashboard({
  users,
  loading,
  error,
  message,
  currentUserId,
  actionLoadingUserId,
  onRefresh,
  onChangeRole,
  onToggleBan,
  cardStyle,
  buttonStyle,
}: AdminDashboardProps) {
  const [selectedRoles, setSelectedRoles] = useState<
    Record<number, "user" | "admin">
  >({});

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

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {message && <p style={{ color: "#15803d" }}>{message}</p>}

      {!loading && !error && (
        <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
          <h3>Registered Users ({users.length})</h3>

          {users.map((adminUser) => {
            const isSelf = adminUser.id === currentUserId;
            const isBusy = actionLoadingUserId === adminUser.id;
            const selectedRole =
              selectedRoles[adminUser.id] ?? adminUser.role;

            return (
              <div
                key={adminUser.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 14,
                }}
              >
                <strong>{adminUser.full_name}</strong>

                <p style={{ margin: "6px 0", color: "#64748b" }}>
                  {adminUser.email}
                </p>

                <p style={{ fontSize: 13, margin: "6px 0" }}>
                  Current role: <strong>{adminUser.role}</strong>
                </p>

                <span
                  style={{
                    display: "block",
                    fontSize: 13,
                    marginTop: 5,
                    marginBottom: 12,
                    color: adminUser.is_banned ? "#dc2626" : "#15803d",
                  }}
                >
                  {adminUser.is_banned ? "Banned" : "Active"}
                </span>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <select
                    value={selectedRole}
                    disabled={isSelf || isBusy}
                    onChange={(event) =>
                      setSelectedRoles((previous) => ({
                        ...previous,
                        [adminUser.id]: event.target.value as
                          | "user"
                          | "admin",
                      }))
                    }
                    style={{
                      padding: 9,
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                    }}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>

                  <button
                    disabled={
                      isSelf || isBusy || selectedRole === adminUser.role
                    }
                    onClick={() =>
                      onChangeRole(adminUser.id, selectedRole)
                    }
                    style={{
                      ...buttonStyle,
                      opacity:
                        isSelf ||
                        isBusy ||
                        selectedRole === adminUser.role
                          ? 0.5
                          : 1,
                    }}
                  >
                    Save Role
                  </button>

                  <button
                    disabled={
                      isSelf ||
                      isBusy ||
                      (adminUser.role === "admin" && !adminUser.is_banned)
                    }
                    onClick={() =>
                      onToggleBan(adminUser.id, !adminUser.is_banned)
                    }
                    style={{
                      ...buttonStyle,
                      background: adminUser.is_banned ? "#dcfce7" : "#fee2e2",
                      color: adminUser.is_banned ? "#166534" : "#991b1b",
                      opacity:
                        isSelf ||
                        isBusy ||
                        (adminUser.role === "admin" && !adminUser.is_banned)
                          ? 0.5
                          : 1,
                    }}
                  >
                    {isBusy
                      ? "Updating..."
                      : adminUser.is_banned
                        ? "Unban User"
                        : "Ban User"}
                  </button>
                </div>

                {isSelf && (
                  <p style={{ fontSize: 12, color: "#64748b" }}>
                    Your own account cannot be modified here.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
