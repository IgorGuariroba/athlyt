export const DEV_SESSION_EMAIL = "dev@athlyt.local";
export const DEV_SESSION_TOKEN = "athlyt-local-development-session";

/** O bypass existe somente no servidor iniciado por `next dev`. */
export function isDevSessionEnabled() {
  return process.env.NODE_ENV === "development";
}
