import { Resend, type CreateEmailOptions } from "resend";
import { config } from "../config.js";
import type { SendEmailInput, SendEmailResponse } from "@skate5/shared";

class EmailConfigurationError extends Error {
  constructor() {
    super("Email is not configured. Set RESEND_API_KEY in the API environment.");
    this.name = "EmailConfigurationError";
  }
}

const getResend = (): Resend => {
  if (!config.email.resendApiKey) {
    throw new EmailConfigurationError();
  }

  return new Resend(config.email.resendApiKey);
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
    replyTo: config.email.replyTo,
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

export const sendEmail = async ({
  input,
}: {
  input: SendEmailInput;
}): Promise<SendEmailResponse> => {
  const resend = getResend();
  const result = await resend.emails.send(createEmailOptions({ input }));

  if (result.error) {
    throw new Error(`Resend email failed: ${result.error.message}`);
  }

  return {
    id: result.data.id,
  };
};
