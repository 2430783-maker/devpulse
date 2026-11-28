
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type CSSProperties,
} from "react";

import AdminDashboard from "./components/AdminDashboard";
import IncidentForm from "./components/IncidentForm";
import IncidentList from "./components/IncidentList";
import IncidentDetails from "./components/IncidentDetails";

import {
  emptyIncidentForm,
  type Incident,
  type IncidentFormData,
} from "./types/incident";

type User = {
  id: number;
  email: string;
  full_name: string;
  role: string;
};

type AuthMode = "login" | "register";

type AdminUser = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_banned: boolean;
};

const API = import.meta.env.VITE_API_URL || "";

const card: CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 20,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: 11,
  border: "1px solid #d1d5db",
  borderRadius: 7,
  marginTop: 6,
  boxSizing: "border-box",
  fontSize: 14,
};

const buttonStyle: CSSProperties = {
  padding: "10px 16px",
  border: 0,
  borderRadius: 7,
  cursor: "pointer",
  fontWeight: 600,
};

async function errorMessage(response: Response) {
  try {
    const data = await response.json();
    return data.detail || data.message || "Something went wrong.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const tokenRef = useRef<string | null>(null);

  const [authMode, setAuthMode] = useState<AuthMode>("login");

  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    full_name: "",
  });

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] =
    useState<Incident | null>(null);

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");

  const [form, setForm] =
    useState<IncidentFormData>(emptyIncidentForm);
  const [editing, setEditing] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  function saveToken(token: string | null) {
    tokenRef.current = token;
  }

  function clearAuthentication() {
    saveToken(null);
    setUser(null);
    setIncidents([]);
    setSelectedIncident(null);
    setAdminUsers([]);
    setAdminError("");
    setAdminMessage("");
    setEditing(null);
    setForm(emptyIncidentForm);
  }

  async function refreshAccessToken(): Promise<string | null> {
    try {
      const response = await fetch(`${API}/api/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (!data.access_token) {
        return null;
      }

      saveToken(data.access_token);
      return data.access_token;
    } catch {
      return null;
    }
  }

  async function apiRequest(
    path: string,
    options: RequestInit = {},
    allowRefresh = true
  ): Promise<Response> {
    const makeRequest = (token: string | null) => {
      const headers = new Headers(options.headers);

      if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return fetch(`${API}${path}`, {
        ...options,
        headers,
        credentials: "include",
      });
    };

    let response = await makeRequest(tokenRef.current);

    const excludedPaths = [
      "/api/v1/auth/login",
      "/api/v1/auth/register",
      "/api/v1/auth/refresh",
      "/api/v1/auth/logout",
    ];

    if (
      response.status === 401 &&
      allowRefresh &&
      !excludedPaths.includes(path)
    ) {
      const newToken = await refreshAccessToken();

      if (newToken) {
        response = await makeRequest(newToken);
      } else {
        clearAuthentication();
      }
    }

    return response;
  }

  async function loadIncidents() {
    setIncidentsLoading(true);

    try {
      const response = await apiRequest("/api/v1/incidents");

      if (response.status === 401) {
        clearAuthentication();
        setMessage("Your session has expired. Please log in again.");
        return;
      }

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      setIncidents(await response.json());
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load incidents."
      );
    } finally {
      setIncidentsLoading(false);
    }
  }

  async function loadAdminUsers() {
    setAdminLoading(true);
    setAdminError("");
    setAdminMessage("");

    try {
      const response = await apiRequest("/api/v1/admin/users");

      if (response.status === 403) {
        throw new Error("You do not have permission to view users.");
      }

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      const data = await response.json();
      setAdminUsers(data);
    } catch (error) {
      setAdminError(
        error instanceof Error
          ? error.message
          : "Unable to load users."
      );
    } finally {
      setAdminLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const token = await refreshAccessToken();

        if (!token) {
          return;
        }

        const response = await apiRequest("/api/v1/auth/me");

        if (!response.ok) {
          clearAuthentication();
          return;
        }

        const currentUser: User = await response.json();

        if (cancelled) return;

        setUser(currentUser);

        await loadIncidents();

        if (currentUser.role === "admin") {
          await loadAdminUsers();
        }
      } catch {
        if (!cancelled) {
          clearAuthentication();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setSubmitting(true);

    const isRegister = authMode === "register";

    try {
      const response = await fetch(
        `${API}/api/v1/auth/${isRegister ? "register" : "login"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(
            isRegister
              ? authForm
              : {
                  email: authForm.email,
                  password: authForm.password,
                }
          ),
        }
      );

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      const data = await response.json();

      if (isRegister) {
        setAuthMode("login");
        setAuthForm({
          email: authForm.email,
          password: "",
          full_name: "",
        });
        setMessage("Account created successfully. Please log in.");
        return;
      }

      saveToken(data.access_token);
      setUser(data.user);

      setAuthForm({
        email: "",
        password: "",
        full_name: "",
      });

      setMessage("Welcome to DevPulse!");

      await loadIncidents();

      if (data.user.role === "admin") {
        await loadAdminUsers();
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Authentication failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch(`${API}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      clearAuthentication();
      setMessage("You have been logged out.");
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setSubmitting(true);

    const isEditing = editing !== null;

    const url = isEditing
      ? `/api/v1/incidents/${editing}`
      : "/api/v1/incidents";

    try {
      const response = await apiRequest(url, {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify(form),
      });

      if (response.status === 401) {
        clearAuthentication();
        setMessage("Your session has expired. Please log in again.");
        return;
      }

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      setForm(emptyIncidentForm);
      setEditing(null);

      setMessage(
        isEditing ? "Incident updated!" : "Incident created!"
      );

      await loadIncidents();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Action failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleView(id: number) {
    setMessage("");

    try {
      const response = await apiRequest(`/api/v1/incidents/${id}`);

      if (response.status === 401) {
        clearAuthentication();
        setMessage("Your session has expired. Please log in again.");
        return;
      }

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      const incident: Incident = await response.json();
      setSelectedIncident(incident);
      setEditing(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load incident details."
      );
    }
  }

  function startEdit(incident: Incident) {
    setSelectedIncident(null);
    setEditing(incident.id);

    setForm({
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      status: incident.status,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    setEditing(null);
    setForm(emptyIncidentForm);
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this incident?")) return;

    try {
      const response = await apiRequest(
        `/api/v1/incidents/${id}`,
        {
          method: "DELETE",
        }
      );

      if (response.status === 401) {
        clearAuthentication();
        setMessage("Your session has expired. Please log in again.");
        return;
      }

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      if (selectedIncident?.id === id) {
        setSelectedIncident(null);
      }

      setMessage("Incident deleted.");
      await loadIncidents();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not delete incident."
      );
    }
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f4f6fb",
          color: "#172033",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h2>Loading DevPulse...</h2>
      </main>
    );
  }

  if (!user) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f4f6fb",
          display: "grid",
          placeItems: "center",
          padding: 20,
          fontFamily: "Arial, sans-serif",
          color: "#172033",
        }}
      >
        <section
          style={{
            ...card,
            width: "100%",
            maxWidth: 420,
            boxSizing: "border-box",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 25 }}>
            <h1
              style={{
                fontSize: 32,
                marginBottom: 8,
                color: "#4f46e5",
              }}
            >
              DevPulse
            </h1>

            <p style={{ color: "#64748b" }}>
              Incident Management System
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 22,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setMessage("");
              }}
              style={{
                ...buttonStyle,
                flex: 1,
                background:
                  authMode === "login" ? "#4f46e5" : "#e5e7eb",
                color: authMode === "login" ? "#fff" : "#374151",
              }}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode("register");
                setMessage("");
              }}
              style={{
                ...buttonStyle,
                flex: 1,
                background:
                  authMode === "register" ? "#4f46e5" : "#e5e7eb",
                color: authMode === "register" ? "#fff" : "#374151",
              }}
            >
              Register
            </button>
          </div>

          <h2 style={{ marginTop: 0 }}>
            {authMode === "login"
              ? "Welcome back"
              : "Create your account"}
          </h2>

          <form onSubmit={handleAuthSubmit}>
            {authMode === "register" && (
              <label style={{ display: "block", marginBottom: 14 }}>
                Full name
                <input
                  required
                  minLength={2}
                  maxLength={150}
                  style={inputStyle}
                  placeholder="Your full name"
                  value={authForm.full_name}
                  onChange={(e) =>
                    setAuthForm({
                      ...authForm,
                      full_name: e.target.value,
                    })
                  }
                />
              </label>
            )}

            <label style={{ display: "block", marginBottom: 14 }}>
              Email
              <input
                required
                type="email"
                style={inputStyle}
                placeholder="you@example.com"
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm({
                    ...authForm,
                    email: e.target.value,
                  })
                }
              />
            </label>

            <label style={{ display: "block", marginBottom: 18 }}>
              Password
              <input
                required
                type="password"
                minLength={authMode === "register" ? 8 : undefined}
                maxLength={128}
                style={inputStyle}
                placeholder="Enter your password"
                value={authForm.password}
                onChange={(e) =>
                  setAuthForm({
                    ...authForm,
                    password: e.target.value,
                  })
                }
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              style={{
                ...buttonStyle,
                width: "100%",
                background: "#4f46e5",
                color: "#fff",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting
                ? "Please wait..."
                : authMode === "login"
                  ? "Login"
                  : "Create Account"}
            </button>
          </form>

          {message && (
            <p
              style={{
                background: "#e0e7ff",
                padding: 12,
                borderRadius: 8,
                marginTop: 18,
                fontSize: 14,
              }}
            >
              {message}
            </p>
          )}

          <p
            style={{
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 12,
              marginTop: 25,
            }}
          >
            DevPulse · Secure Incident Management
          </p>
        </section>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f6fb",
        color: "#172033",
        fontFamily: "Arial, sans-serif",
        padding: "32px 18px",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 15,
            marginBottom: 28,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 30 }}>DevPulse</h1>

            <p style={{ color: "#64748b", marginBottom: 0 }}>
              Incident Management Dashboard
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 600 }}>{user.full_name}</div>

              <span
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  textTransform: "capitalize",
                }}
              >
                {user.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              style={{
                ...buttonStyle,
                background: "#fee2e2",
                color: "#991b1b",
              }}
            >
              Logout
            </button>
          </div>
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

        {user.role === "admin" && (
          <AdminDashboard
            users={adminUsers}
            loading={adminLoading}
            error={adminError}
            message={adminMessage}
            onRefresh={loadAdminUsers}
            cardStyle={card}
            buttonStyle={buttonStyle}
          />
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
              loading={incidentsLoading}
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
