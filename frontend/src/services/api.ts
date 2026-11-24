
import type { Incident, IncidentFormData } from "../types/incident";

const API = import.meta.env.VITE_API_URL || "";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export function getIncidents(): Promise<Incident[]> {
  return request<Incident[]>("/api/v1/incidents");
}

export function getIncident(id: number): Promise<Incident> {
  return request<Incident>(`/api/v1/incidents/${id}`);
}

export function createIncident(data: IncidentFormData): Promise<Incident> {
  return request<Incident>("/api/v1/incidents", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateIncident(
  id: number,
  data: IncidentFormData
): Promise<Incident> {
  return request<Incident>(`/api/v1/incidents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteIncident(id: number): Promise<void> {
  return request<void>(`/api/v1/incidents/${id}`, {
    method: "DELETE",
  });
}
