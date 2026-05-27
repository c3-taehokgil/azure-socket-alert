import { describe, expect, it } from "vitest";
import { renderAlertEmail } from "./alertEmailRenderer";
import { loadFixture, testAppConfig } from "../test/helpers/webhookTestHelpers";

describe("renderAlertEmail", () => {
  const config = testAppConfig();

  it("renders alert:created fixture with critical subject", () => {
    const payload = loadFixture("alert-created");
    const email = renderAlertEmail(payload, config);

    expect(email.subject).toContain("[Socket Critical]");
    expect(email.subject).toContain("Prototype pollution in lodash");
    expect(email.subject).toContain("c3-ai/platform-services");
    expect(email.importance).toBe("high");
    expect(email.htmlBody).toContain("CVE-2024-12345");
    expect(email.htmlBody).not.toContain("<script>");
  });

  it("renders alert:updated fixture", () => {
    const payload = loadFixture("alert-updated");
    const email = renderAlertEmail(payload, config);

    expect(email.subject).toContain("[Socket Updated/High]");
    expect(email.importance).toBe("high");
  });

  it("renders alert:cleared fixture with low importance", () => {
    const payload = loadFixture("alert-cleared");
    const email = renderAlertEmail(payload, config);

    expect(email.subject).toContain("[Socket Cleared]");
    expect(email.importance).toBe("low");
  });
});
