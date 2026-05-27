import { describe, expect, it } from "vitest";
import { renderAlertEmail } from "./alertEmailRenderer";
import { fixtureNotification, testAppConfig } from "../test/helpers/alertTestHelpers";

describe("renderAlertEmail", () => {
  const config = testAppConfig();

  it("renders alert:created fixture with critical subject", () => {
    const notification = fixtureNotification("alert-created");
    const email = renderAlertEmail(notification, config);

    expect(email.subject).toContain("[Socket Critical]");
    expect(email.subject).toContain("Prototype pollution in lodash");
    expect(email.subject).toContain("c3-ai/platform-services");
    expect(email.importance).toBe("high");
    expect(email.htmlBody).toContain("CVE-2024-12345");
    expect(email.htmlBody).not.toContain("<script>");
  });

  it("renders alert:updated fixture", () => {
    const notification = fixtureNotification("alert-updated");
    const email = renderAlertEmail(notification, config);

    expect(email.subject).toContain("[Socket Updated/High]");
    expect(email.importance).toBe("high");
  });

  it("renders alert:cleared fixture with low importance", () => {
    const notification = fixtureNotification("alert-cleared");
    const email = renderAlertEmail(notification, config);

    expect(email.subject).toContain("[Socket Cleared]");
    expect(email.importance).toBe("low");
  });
});
