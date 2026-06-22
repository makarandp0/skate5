import { userRoleSchema, type UserRole } from "@skate5/shared";

const effectiveRoleStorageKey = "skate5-effective-role";

export const getStoredEffectiveRole = (): UserRole | null => {
  const stored = localStorage.getItem(effectiveRoleStorageKey);
  if (!stored) return null;

  const parsed = userRoleSchema.safeParse(stored);
  if (parsed.success) return parsed.data;

  localStorage.removeItem(effectiveRoleStorageKey);
  return null;
};

export const setStoredEffectiveRole = (role: UserRole | null): void => {
  if (role) {
    localStorage.setItem(effectiveRoleStorageKey, role);
  } else {
    localStorage.removeItem(effectiveRoleStorageKey);
  }
};
