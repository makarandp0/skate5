import { createApiClient } from "@skate5/shared";
import { getFirebaseAuth } from "./firebase.js";
import { getStoredEffectiveRole } from "./rolePreference.js";

export const getApiAuthHeaders = async (): Promise<Record<string, string>> => {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Not authenticated");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${await user.getIdToken()}`,
  };
  const effectiveRole = getStoredEffectiveRole();
  if (effectiveRole) {
    headers["X-Skate5-Effective-Role"] = effectiveRole;
  }

  return headers;
};

export const api = createApiClient({
  baseUrl: "/api",
  getToken: async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new Error("Not authenticated");
    return user.getIdToken();
  },
  getEffectiveRole: getStoredEffectiveRole,
});
