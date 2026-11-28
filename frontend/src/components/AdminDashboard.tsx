
import { useMemo, useState } from "react";
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
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const pageSize = 5;

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchMatch =
        user.full_name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());

      const roleMatch =
        roleFilter === "all" || user.role === roleFilter;

      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "banned" && user.is_banned) ||
        (statusFilter === "active" && !user.is_banned);

      return searchMatch && roleMatch && statusMatch;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / pageSize)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  function downloadCSV() {
    const headers = ["ID", "Full Name", "Email", "Role", "Status"];

    const rows = filteredUsers.map((user) => [
      user.id,
      user.full_name,
      user.email,
      user.role,
      user.is_banned ? "Banned" : "Active",
    ]);

    const escapeCSV = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "devpulse-users.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

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

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onRefresh} style={buttonStyle}>
            Refresh Users
          </button>

          <button
            onClick={downloadCSV}
            disabled={filteredUsers.length === 0}
            style={buttonStyle}
          >
            Export CSV
          </button>
        </div>
      </div>

      {loading && <p>Loading users...</p>}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      {message && <p style={{ color: "#15803d" }}>{message}</p>}

      {!loading && !error && (
        <>
          <h3>Registered Users ({filteredUsers.length})</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <input
              type="search"
              placeholder="Search name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                padding: 10,
                border: "1px solid #cbd5e1",
                borderRadius: 7,
                minWidth: 0,
              }}
            />

            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: 10,
                border: "1px solid #cbd5e1",
                borderRadius: 7,
              }}
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: 10,
                border: "1px solid #cbd5e1",
                borderRadius: 7,
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
            </select>
          </div>

          {visibleUsers.length === 0 && (
            <p>No users match your filters.</p>
          )}

          <div style={{ display: "grid", gap: 12 }}>
            {visibleUsers.map((adminUser) => {
              const isSelf = adminUser.id === currentUserId;
              const isBusy =
                actionLoadingUserId === adminUser.id;

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
                      color: adminUser.is_banned
                        ? "#dc2626"
                        : "#15803d",
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
                        isSelf ||
                        isBusy ||
                        selectedRole === adminUser.role
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
                        (adminUser.role === "admin" &&
                          !adminUser.is_banned)
                      }
                      onClick={() =>
                        onToggleBan(
                          adminUser.id,
                          !adminUser.is_banned
                        )
                      }
                      style={{
                        ...buttonStyle,
                        background: adminUser.is_banned
                          ? "#dcfce7"
                          : "#fee2e2",
                        color: adminUser.is_banned
                          ? "#166534"
                          : "#991b1b",
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

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 18,
            }}
          >
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Page {currentPage} of {totalPages} ·{" "}
              {filteredUsers.length} matching users
            </span>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={buttonStyle}
                disabled={currentPage <= 1}
                onClick={() =>
                  setPage((p) => Math.max(1, p - 1))
                }
              >
                Previous
              </button>

              <button
                style={buttonStyle}
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
