import { Resend, type CreateEmailOptions } from "resend";
import { z } from "zod";
import { config } from "../config.js";
import type { SendEmailInput, SendEmailResponse } from "@skate5/shared";

const EMAIL_RECIPIENT_BATCH_SIZE = 5;
const EMAIL_BATCH_DELAY_MS = 2_000;
const MAX_TRANSIENT_EMAIL_ATTEMPTS = 3;
const TRANSIENT_EMAIL_RETRY_DELAY_MS = 5_000;

const emailAddressSchema = z.email();

class EmailConfigurationError extends Error {
  constructor() {
    super("Email is not configured. Set RESEND_API_KEY in the API environment.");
    this.name = "EmailConfigurationError";
  }
}

type RecipientField = "to" | "cc" | "bcc";

interface Recipient {
  field: RecipientField;
  email: string;
}

const getResend = (): Resend => {
  if (!config.email.resendApiKey) {
    throw new EmailConfigurationError();
  }

  return new Resend(config.email.resendApiKey);
};

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const recipientsFrom = (field: RecipientField, emails: string[]): Recipient[] => {
  return emails.map((email) => ({ field, email }));
};

const chunkRecipients = (
  recipients: Recipient[],
  batchSize: number
): Recipient[][] => {
  const chunks: Recipient[][] = [];

  for (let index = 0; index < recipients.length; index += batchSize) {
    chunks.push(recipients.slice(index, index + batchSize));
  }

  return chunks;
};

const getSenderEmailAddress = (): string => {
  const trimmed = config.email.fromEmail.trim();
  const start = trimmed.lastIndexOf("<");
  const end = trimmed.lastIndexOf(">");

  if (start >= 0 && end > start) {
    return emailAddressSchema.parse(trimmed.slice(start + 1, end).trim());
  }

  return emailAddressSchema.parse(trimmed);
};

const getRecipientEmails = (
  recipients: Recipient[],
  field: RecipientField
): string[] => {
  return recipients
    .filter((recipient) => recipient.field === field)
    .map((recipient) => recipient.email);
};

const createChunkedEmailInput = ({
  input,
  recipients,
  fallbackTo,
}: {
  input: SendEmailInput;
  recipients: Recipient[];
  fallbackTo: string;
}): SendEmailInput => {
  const to = getRecipientEmails(recipients, "to");
  const cc = getRecipientEmails(recipients, "cc");
  const bcc = getRecipientEmails(recipients, "bcc");

  return {
    ...input,
    to: to.length > 0 ? to : [fallbackTo],
    cc,
    bcc,
  };
};

const createEmailOptions = ({
  input,
}: {
  input: SendEmailInput;
}): CreateEmailOptions => {
  const base = {
    from: config.email.fromEmail,
    to: input.to,
    cc: input.cc.length > 0 ? input.cc : undefined,
    bcc: input.bcc.length > 0 ? input.bcc : undefined,
    replyTo: input.replyTo ?? config.email.replyTo,
    subject: input.subject,
  };

  if (input.html && input.text) {
    return {
      ...base,
      html: input.html,
      text: input.text,
    };
  }

  if (input.html) {
    return {
      ...base,
      html: input.html,
    };
  }

  return {
    ...base,
    text: input.text ?? "",
  };
};

const getTransientEmailRetryDelay = ({
  attempt,
  statusCode,
}: {
  attempt: number;
  statusCode: number | null;
}): number | null => {
  if (attempt >= MAX_TRANSIENT_EMAIL_ATTEMPTS) return null;

  if (statusCode === 421 || statusCode === 429 || statusCode === null) {
    return TRANSIENT_EMAIL_RETRY_DELAY_MS;
  }

  if (statusCode >= 500 && statusCode < 600) {
    return TRANSIENT_EMAIL_RETRY_DELAY_MS;
  }

  return null;
};

const sendEmailWithRetries = async ({
  resend,
  input,
}: {
  resend: Resend;
  input: SendEmailInput;
}): Promise<string> => {
  for (let attempt = 1; attempt <= MAX_TRANSIENT_EMAIL_ATTEMPTS; attempt += 1) {
    const result = await resend.emails.send(createEmailOptions({ input }));

    if (!result.error) {
      return result.data.id;
    }

    const retryDelay = getTransientEmailRetryDelay({
      attempt,
      statusCode: result.error.statusCode,
    });

    if (retryDelay === null) {
      throw new Error(`Resend email failed: ${result.error.message}`);
    }

    await sleep(retryDelay);
  }

  throw new Error("Resend email failed after retrying temporary delivery errors.");
};

export const sendEmail = async ({
  input,
}: {
  input: SendEmailInput;
}): Promise<SendEmailResponse> => {
  const resend = getResend();
  const recipients = [
    ...recipientsFrom("to", input.to),
    ...recipientsFrom("cc", input.cc),
    ...recipientsFrom("bcc", input.bcc),
  ];
  const recipientChunks = chunkRecipients(recipients, EMAIL_RECIPIENT_BATCH_SIZE);
  const fallbackTo = getSenderEmailAddress();
  const ids: string[] = [];

  for (const [index, recipientsForChunk] of recipientChunks.entries()) {
    if (index > 0) {
      await sleep(EMAIL_BATCH_DELAY_MS);
    }

    ids.push(
      await sendEmailWithRetries({
        resend,
        input: createChunkedEmailInput({
          input,
          recipients: recipientsForChunk,
          fallbackTo,
        }),
      })
    );
  }

  const id = ids[0];
  if (!id) {
    throw new Error("Resend email failed: no messages were sent.");
  }

  return {
    id,
  };
};
