import { SocketAlert, SocketAlertsListResponse } from "../types/socketAlert";

export class SocketApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "SocketApiError";
  }
}

export interface ListAlertsOptions {
  orgSlug: string;
  apiToken: string;
  baseUrl: string;
  updatedSince?: string;
  perPage?: number;
}

export async function listAllAlerts(options: ListAlertsOptions): Promise<SocketAlert[]> {
  const alerts: SocketAlert[] = [];
  let cursor: string | undefined;

  do {
    const page = await fetchAlertsPage(options, cursor);
    alerts.push(...page.items);
    cursor = page.endCursor?.trim() || undefined;
  } while (cursor);

  return alerts;
}

async function fetchAlertsPage(
  options: ListAlertsOptions,
  startAfterCursor?: string,
): Promise<SocketAlertsListResponse> {
  const url = new URL(`${options.baseUrl}/orgs/${encodeURIComponent(options.orgSlug)}/alerts`);
  url.searchParams.set("per_page", String(options.perPage ?? 500));

  if (startAfterCursor) {
    url.searchParams.set("startAfterCursor", startAfterCursor);
  }

  if (options.updatedSince) {
    url.searchParams.set("filters.alertUpdatedAt.gte", options.updatedSince);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${options.apiToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new SocketApiError(
      `Socket alerts API failed (${response.status}): ${body.slice(0, 500)}`,
      response.status,
    );
  }

  const data = (await response.json()) as SocketAlertsListResponse;
  return {
    items: data.items ?? [],
    endCursor: data.endCursor ?? null,
  };
}
