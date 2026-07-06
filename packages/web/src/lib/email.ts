export const splitEmailList = (value: string): string[] => {
  return value
    .split(/[\s,;]+/)
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
};
