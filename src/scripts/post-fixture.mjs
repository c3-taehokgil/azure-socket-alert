#!/usr/bin/env node
/**
 * POST a signed Socket.dev dummy fixture to the local (or remote) Function webhook.
 *
 * Usage:
 *   node scripts/post-fixture.mjs alert-created
 *   BASE_URL=https://localhost:7071 CODE=<key> node scripts/post-fixture.mjs alert-updated
 *
 * SOCKET_WEBHOOK_SECRET must match local.settings.json (default: test secret from webhookTestHelpers).
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureName = process.argv[2] || "alert-created";
const valid = ["alert-created", "alert-updated", "alert-cleared"];

if (!valid.includes(fixtureName)) {
  console.error(`Usage: node scripts/post-fixture.mjs <${valid.join("|")}>`);
  process.exit(1);
}

const secret =
  process.env.SOCKET_WEBHOOK_SECRET ||
  "whsec_" + Buffer.from("test-signing-key-24bytes!!").toString("base64");

const baseUrl = (process.env.BASE_URL || "http://localhost:7071").replace(/\/$/, "");
const code = process.env.CODE || process.env.FUNCTION_KEY || "";
const url = `${baseUrl}/api/socket-webhook${code ? `?code=${code}` : ""}`;

const body = readFileSync(join(__dirname, "..", "test", "fixtures", `${fixtureName}.json`), "utf8");
const timestamp = Math.floor(Date.now() / 1000);
const encoded = secret.startsWith("whsec_") ? secret.slice(6) : secret;
const key = Buffer.from(encoded, "base64");
const signature = createHmac("sha256", key).update(`${timestamp}.${body}`, "utf8").digest("base64");
const signatureHeader = `t=${timestamp},s=${signature}`;

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-webhook-signature": signatureHeader,
  },
  body,
});

const text = await response.text();
console.log(`POST ${url}`);
console.log(`Fixture: ${fixtureName}`);
console.log(`Status: ${response.status}`);
console.log(text);

if (!response.ok) {
  process.exit(1);
}
