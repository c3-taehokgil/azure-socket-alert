import { ManagedIdentityCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import { AppConfig } from "../config";
import { RenderedEmail } from "./alertEmailRenderer";

let graphClient: Client | undefined;

function getGraphClient(): Client {
  if (!graphClient) {
    const credential = new ManagedIdentityCredential();
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ["https://graph.microsoft.com/.default"],
    });
    graphClient = Client.initWithMiddleware({ authProvider });
  }
  return graphClient;
}

export async function sendAlertEmail(config: AppConfig, email: RenderedEmail): Promise<void> {
  const client = getGraphClient();

  const toRecipients = config.mailToAddresses.map((address) => ({
    emailAddress: { address },
  }));

  const message: Record<string, unknown> = {
    subject: email.subject,
    body: {
      contentType: "HTML",
      content: email.htmlBody,
    },
    toRecipients,
    importance: email.importance,
  };

  if (config.mailReplyTo) {
    message.replyTo = [{ emailAddress: { address: config.mailReplyTo } }];
  }

  await client.api(`/users/${encodeURIComponent(config.mailSenderUpn)}/sendMail`).post({
    message,
    saveToSentItems: true,
  });
}

/** Visible for unit tests */
export function resetGraphClientForTests(): void {
  graphClient = undefined;
}
