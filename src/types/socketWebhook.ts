export type SocketAlertEventType = "alert:created" | "alert:updated" | "alert:cleared";

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
  eventId?: string;
  title?: string;
  severity?: string;
  category?: string;
  type?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  clearedAt?: string;
  dashboardUrl?: string;
  vulnerability?: SocketVulnerability;
  locations?: SocketAlertLocation[];
  fix?: string;
}

export interface SocketOrganization {
  slug?: string;
  name?: string;
}

export interface SocketAlertWebhookPayload {
  type: SocketAlertEventType;
  eventId?: string;
  schemaType?: string;
  timestamp?: string;
  data?: {
    alert?: SocketAlert;
    organization?: SocketOrganization;
  };
}
