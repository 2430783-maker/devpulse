
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type Group = {
  id: number;
  name: string;
  owner_id: number;
  membership_role: "owner" | "member";
};

type GroupMember = {
  id: number;
  email: string;
  full_name: string;
  membership_role: "owner" | "member";
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

type GroupsDashboardProps = {
  apiRequest: (
    path: string,
    options?: RequestInit
  ) => Promise<Response>;
  cardStyle: CSSProperties;
  buttonStyle: CSSProperties;
};

async function getError(response: Response) {
  try {
    const data = await response.json();
    return data.detail || data.message || "Something went wrong.";
  } catch {
    return "Something went wrong.";
  }
}

export default function GroupsDashboard({
  apiRequest,
  cardStyle,
  buttonStyle,
}: GroupsDashboardProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);

  const [groupName, setGroupName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [renamedGroup, setRenamedGroup] = useState("");

  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const primaryButton: CSSProperties = {
    ...buttonStyle,
    background: "#4f46e5",
    color: "#fff",
  };

  const secondaryButton: CSSProperties = {
    ...buttonStyle,
    background: "#e5e7eb",
    color: "#374151",
  };

  const dangerButton: CSSProperties = {
    ...buttonStyle,
    background: "#fee2e2",
    color: "#991b1b",
  };

  async function loadGroups() {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest("/api/v1/groups");

      if (!response.ok) {
        throw new Error(await getError(response));
      }

      const data = await response.json();
      setGroups(data.groups ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load groups."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers(group: Group) {
    setSelectedGroup(group);
    setRenamedGroup(group.name);
    setMembersLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await apiRequest(
        `/api/v1/groups/${group.id}/members`
      );

      if (!response.ok) {
        throw new Error(await getError(response));
      }

      const data = await response.json();
      setMembers(data.members ?? []);
    } catch (err) {
      setMembers([]);
      setError(
        err instanceof Error ? err.message : "Unable to load members."
      );
    } finally {
      setMembersLoading(false);
    }
  }

  useEffect(() => {
    void loadGroups();
  }, []);

  async function createGroup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const response = await apiRequest("/api/v1/groups", {
        method: "POST",
        body: JSON.stringify({ name: groupName }),
      });

      if (!response.ok) {
        throw new Error(await getError(response));
      }

      const data = await response.json();
      setGroupName("");
      setMessage("Group created successfully.");

      await loadGroups();

      if (data.group) {
        await loadMembers({
          ...data.group,
          membership_role: "owner",
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create group."
      );
    }
  }

  async function addMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedGroup) return;

    setError("");
    setMessage("");

    try {
      const response = await apiRequest(
        `/api/v1/groups/${selectedGroup.id}/members`,
        {
          method: "POST",
          body: JSON.stringify({ email: newMemberEmail.trim() }),
        }
      );

      if (!response.ok) {
        throw new Error(await getError(response));
      }

      setNewMemberEmail("");
      setMessage("Member added successfully.");
      await loadMembers(selectedGroup);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to add member."
      );
    }
  }

  async function updatePermission(
    member: GroupMember,
    permission: "can_view" | "can_create" | "can_edit" | "can_delete"
  ) {
    if (!selectedGroup) return;

    const updated = {
      can_view: member.can_view,
      can_create: member.can_create,
      can_edit: member.can_edit,
      can_delete: member.can_delete,
      [permission]: !member[permission],
    };

    setError("");
    setMessage("");

    try {
      const response = await apiRequest(
        `/api/v1/groups/${selectedGroup.id}/members/${member.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(updated),
        }
      );

      if (!response.ok) {
        throw new Error(await getError(response));
      }

      setMessage("Member permissions updated.");
      await loadMembers(selectedGroup);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update permissions."
      );
    }
  }

  async function removeMember(member: GroupMember) {
    if (!selectedGroup) return;

    if (!window.confirm(`Remove ${member.email} from this group?`)) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await apiRequest(
        `/api/v1/groups/${selectedGroup.id}/members/${member.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(await getError(response));
      }

      setMessage("Member removed.");
      await loadMembers(selectedGroup);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to remove member."
      );
    }
  }

  async function renameGroup() {
    if (!selectedGroup || !renamedGroup.trim()) return;

    setError("");
    setMessage("");

    try {
      const response = await apiRequest(
        `/api/v1/groups/${selectedGroup.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ name: renamedGroup.trim() }),
        }
      );

      if (!response.ok) {
        throw new Error(await getError(response));
      }

      setMessage("Group renamed successfully.");
      await loadGroups();

      setSelectedGroup({
        ...selectedGroup,
        name: renamedGroup.trim(),
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to rename group."
      );
    }
  }

  async function deleteGroup() {
    if (!selectedGroup) return;

    if (!window.confirm(`Delete the group "${selectedGroup.name}"?`)) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await apiRequest(
        `/api/v1/groups/${selectedGroup.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(await getError(response));
      }

      setSelectedGroup(null);
      setMembers([]);
      setMessage("Group deleted.");
      await loadGroups();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete group."
      );
    }
  }

  const isOwner = selectedGroup?.membership_role === "owner";

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
        <h2 style={{ margin: 0 }}>Shared Groups</h2>

        <button
          type="button"
          onClick={loadGroups}
          style={secondaryButton}
        >
          Refresh Groups
        </button>
      </div>

      {error && (
        <p style={{ color: "#dc2626", background: "#fee2e2", padding: 10 }}>
          {error}
        </p>
      )}

      {message && (
        <p style={{ color: "#15803d", background: "#dcfce7", padding: 10 }}>
          {message}
        </p>
      )}

      <form
        onSubmit={createGroup}
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginTop: 18,
        }}
      >
        <input
          required
          minLength={2}
          maxLength={100}
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="New group name"
          style={{
            flex: 1,
            minWidth: 180,
            padding: 10,
            border: "1px solid #d1d5db",
            borderRadius: 7,
          }}
        />

        <button type="submit" style={primaryButton}>
          Create Group
        </button>
      </form>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 22,
        }}
      >
        <div>
          <h3>Your Groups ({groups.length})</h3>

          {loading && <p>Loading groups...</p>}

          {!loading && groups.length === 0 && (
            <p style={{ color: "#64748b" }}>
              No groups yet. Create your first group.
            </p>
          )}

          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => loadMembers(group)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: 12,
                marginBottom: 8,
                borderRadius: 8,
                border:
                  selectedGroup?.id === group.id
                    ? "2px solid #4f46e5"
                    : "1px solid #e5e7eb",
                background:
                  selectedGroup?.id === group.id ? "#eef2ff" : "#fff",
                cursor: "pointer",
              }}
            >
              <strong>{group.name}</strong>
              <span
                style={{
                  display: "block",
                  marginTop: 5,
                  fontSize: 12,
                  color: "#64748b",
                  textTransform: "capitalize",
                }}
              >
                {group.membership_role}
              </span>
            </button>
          ))}
        </div>

        <div>
          {!selectedGroup ? (
            <div>
              <h3>Group Details</h3>
              <p style={{ color: "#64748b" }}>
                Select a group to view its members and permissions.
              </p>
            </div>
          ) : (
            <>
              <h3 style={{ marginTop: 0 }}>{selectedGroup.name}</h3>

              {membersLoading ? (
                <p>Loading members...</p>
              ) : (
                <>
                  <p style={{ color: "#64748b", fontSize: 13 }}>
                    {members.length} group member(s)
                  </p>

                  {isOwner && (
                    <>
                      <form
                        onSubmit={addMember}
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          marginBottom: 18,
                        }}
                      >
                        <input
                          required
                          type="email"
                          value={newMemberEmail}
                          onChange={(e) =>
                            setNewMemberEmail(e.target.value)
                          }
                          placeholder="Existing user's email"
                          style={{
                            flex: 1,
                            minWidth: 150,
                            padding: 9,
                            border: "1px solid #d1d5db",
                            borderRadius: 7,
                          }}
                        />

                        <button type="submit" style={primaryButton}>
                          Add Member
                        </button>
                      </form>

                      <div style={{ marginBottom: 18 }}>
                        <label style={{ display: "block", fontSize: 13 }}>
                          Rename group
                          <input
                            value={renamedGroup}
                            onChange={(e) =>
                              setRenamedGroup(e.target.value)
                            }
                            maxLength={100}
                            style={{
                              width: "100%",
                              padding: 9,
                              marginTop: 5,
                              border: "1px solid #d1d5db",
                              borderRadius: 7,
                              boxSizing: "border-box",
                            }}
                          />
                        </label>

                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button
                            type="button"
                            onClick={renameGroup}
                            style={secondaryButton}
                          >
                            Save Name
                          </button>

                          <button
                            type="button"
                            onClick={deleteGroup}
                            style={dangerButton}
                          >
                            Delete Group
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <h4>Members and Permissions</h4>

                  {members.map((member) => (
                    <div
                      key={member.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 10,
                      }}
                    >
                      <strong>{member.full_name}</strong>
                      <p
                        style={{
                          margin: "4px 0 8px",
                          color: "#64748b",
                          fontSize: 13,
                        }}
                      >
                        {member.email}
                      </p>

                      <span
                        style={{
                          fontSize: 12,
                          textTransform: "capitalize",
                          color: "#4f46e5",
                        }}
                      >
                        {member.membership_role}
                      </span>

                      {member.membership_role === "member" && (
                        <div style={{ marginTop: 10 }}>
                          {(
                            [
                              ["can_view", "View"],
                              ["can_create", "Create"],
                              ["can_edit", "Edit"],
                              ["can_delete", "Delete"],
                            ] as const
                          ).map(([key, label]) => (
                            <label
                              key={key}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                marginRight: 12,
                                marginBottom: 8,
                                fontSize: 13,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={member[key]}
                                disabled={!isOwner}
                                onChange={() =>
                                  updatePermission(member, key)
                                }
                              />
                              {label}
                            </label>
                          ))}

                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => removeMember(member)}
                              style={{
                                ...dangerButton,
                                display: "block",
                                marginTop: 8,
                              }}
                            >
                              Remove Member
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
