import { afterEach, describe, expect, it, vi } from "vitest";
import { listAllAlerts, SocketApiError } from "./socketApiClient";

describe("listAllAlerts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("paginates until endCursor is empty", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: "a1", version: 1 }],
          endCursor: "cursor-1",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: "a2", version: 1 }],
          endCursor: "",
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const alerts = await listAllAlerts({
      orgSlug: "c3-ai",
      apiToken: "token",
      baseUrl: "https://api.socket.dev/v0",
    });

    expect(alerts).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondUrl = String(fetchMock.mock.calls[1]?.[0]);
    expect(secondUrl).toContain("startAfterCursor=cursor-1");
  });

  it("throws SocketApiError on non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      }),
    );

    await expect(
      listAllAlerts({
        orgSlug: "c3-ai",
        apiToken: "bad",
        baseUrl: "https://api.socket.dev/v0",
      }),
    ).rejects.toBeInstanceOf(SocketApiError);
  });
});
