export type IncidentSeverity = "Low" | "Medium" | "High" | "Critical";

export type IncidentStatus = "Open" | "In Progress" | "Resolved";

export interface Incident {
  id: number;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  created_at: string;
  updated_at: string;
}

export interface IncidentFormData {
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
}

export const emptyIncidentForm: IncidentFormData = {
  title: "",
  description: "",
  severity: "Medium",
  status: "Open",
};
