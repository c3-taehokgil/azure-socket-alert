export type SocketAlertEventType = "alert:created" | "alert:updated" | "alert:cleared";

export type SocketAlertStatus = "open" | "cleared";

export interface SocketVulnerability {
  cveId?: string;
  cveTitle?: string;
  cvssScore?: number;
  isKev?: boolean;
}

export interface SocketAlertLocation {
  repo?: string;
  repoSlug?: string;
  manifestFile?: string;
  dependency?: string;
  action?: string;
}

export interface SocketAlert {
  id?: string;
  key?: string;
  version?: number;
  title?: string;
  severity?: string;
  category?: string;
  type?: string;
  description?: string;
  status?: SocketAlertStatus;
  createdAt?: string;
  updatedAt?: string;
  clearedAt?: string | null;
  dashboardUrl?: string;
  vulnerability?: SocketVulnerability;
  locations?: SocketAlertLocation[];
  fix?: string | { type?: string; description?: string | null };
}

export interface SocketAlertsListResponse {
  items: SocketAlert[];
  endCursor?: string | null;
}

export interface AlertNotification {
  eventType: SocketAlertEventType;
  alert: SocketAlert;
  organizationSlug: string;
  notificationId: string;
  timestamp: string;
}
