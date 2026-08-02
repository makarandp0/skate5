export const splitEmailList = (value: string): string[] => {
  return value
    .split(/[\s,;]+/)
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
};

export const createGmailComposeUrl = ({
  to,
  cc = [],
  bcc = [],
  subject,
  body,
}: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
}): string => {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: to.join(","),
    su: subject,
    body,
  });

  if (cc.length > 0) {
    params.set("cc", cc.join(","));
  }

  if (bcc.length > 0) {
    params.set("bcc", bcc.join(","));
  }

  return `https://mail.google.com/mail/?${params.toString()}`;
};

export const createOutlookComposeUrl = ({
  to,
  cc = [],
  bcc = [],
  subject,
  body,
}: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
}): string => {
  const params = new URLSearchParams({
    to: to.join(","),
    subject,
    body,
  });

  if (cc.length > 0) {
    params.set("cc", cc.join(","));
  }

  if (bcc.length > 0) {
    params.set("bcc", bcc.join(","));
  }

  return `https://outlook.office.com/mail/deeplink/compose?${params.toString().replaceAll("+", "%20")}`;
};
