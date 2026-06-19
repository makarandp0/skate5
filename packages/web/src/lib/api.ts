import { createApiClient } from "@skate5/shared";
import { getFirebaseAuth } from "./firebase.js";

export const api = createApiClient({
  baseUrl: "/api",
  getToken: async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new Error("Not authenticated");
    return user.getIdToken();
  },
});
