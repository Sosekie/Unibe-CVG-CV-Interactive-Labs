export interface Env {
  DB: D1Database;
  /** Comma-separated GitHub logins that may use the teacher pages. */
  TEACHERS: string;
  /** Comma-separated origins of the course site, e.g. https://sosekie.github.io */
  ALLOWED_ORIGINS: string;
  /** Path prefix of the course site on those origins. Sign-in only returns below it. */
  SITE_PATH: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  /** Optional signing key. Without it the key is derived from GITHUB_CLIENT_SECRET. */
  SESSION_SECRET?: string;
  /** Local development only: sign in as this login without GitHub. Ignored unless the request is to localhost. */
  DEV_TEACHER_LOGIN?: string;
}
