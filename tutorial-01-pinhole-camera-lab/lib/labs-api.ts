// Client for the course API (api/ in Unibe-CVG-CV-Interactive-Labs), which stores
// votes and answer releases for the static labs. The same file is used by every lab;
// the tutorial id comes from lib/question-bank.ts.
import { tutorialSlug } from '@/lib/question-bank';

// Replaced at build time by vite.config.ts (LABS_API_URL environment variable).
const DEFAULT_API_URL = '';
export const labsApiUrl = (process.env.LABS_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
export const labsApiAvailable = labsApiUrl !== '';

export type QuestionState = { votes: number; hasVoted: boolean; published: boolean };
export type TeacherQuestionState = { votes: number; published: boolean };
export type TeacherSession = { token: string; login: string };

export class LabsApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!labsApiAvailable) throw new LabsApiError('Voting is not connected in this copy of the lab.', 0);
  let response: Response;
  try {
    response = await fetch(labsApiUrl + path, { cache: 'no-store', ...init });
  } catch {
    throw new LabsApiError('The course server cannot be reached. Check your connection.', 0);
  }
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new LabsApiError(data.error ?? 'The course server could not complete the request.', response.status);
  return data;
}

const tutorialPath = `/v1/tutorials/${tutorialSlug}`;

export async function fetchQuestionState(voterId: string): Promise<Record<string, QuestionState>> {
  return (await request<{ questions: Record<string, QuestionState> }>(`${tutorialPath}/state?voter=${encodeURIComponent(voterId)}`)).questions;
}

export function submitVote(questionId: string, voterId: string) {
  return request<{ votes: number }>(`${tutorialPath}/votes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId, voterId }) });
}

export function fetchTeacherState(session: TeacherSession) {
  return request<{ login: string; questions: Record<string, TeacherQuestionState> }>(`${tutorialPath}/teacher`, { headers: { Authorization: `Bearer ${session.token}` } });
}

export function updateRelease(session: TeacherSession, payload: { questionId?: string; scope?: 'all'; published: boolean }) {
  return request<{ ok: true }>(`${tutorialPath}/teacher`, { method: 'PUT', headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}

// A random id per browser, so that each browser votes once per question.
export function browserVoterId(storageKey: string): string {
  const create = () => (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'voter-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;
    const next = create();
    window.localStorage.setItem(storageKey, next);
    return next;
  } catch {
    return create();
  }
}

// Teacher sign-in. GitHub sign-in on the course server returns to this page with
// #teacher_token=…&login=… (or #teacher_error=…). The session is kept in this
// browser for all labs of the course site and expires after 12 hours.
const SESSION_KEY = 'cv-labs-teacher-session';

export function teacherSignInUrl(): string {
  return `${labsApiUrl}/auth/signin?return_to=${encodeURIComponent(window.location.href.split('#')[0])}`;
}

export function takeSignInResult(): { session?: TeacherSession; error?: string; login?: string } {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get('teacher_token');
  const error = params.get('teacher_error');
  const login = params.get('login') ?? undefined;
  if (!token && !error) return {};
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  if (token && login) {
    const session = { token, login };
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Private browsing: the session lasts until the page is closed.
    }
    return { session };
  }
  return { error: error ?? 'github', login };
}

function storedTeacherSession(): TeacherSession | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? 'null') as Partial<TeacherSession> | null;
    return value && typeof value.token === 'string' && typeof value.login === 'string' ? { token: value.token, login: value.login } : null;
  } catch {
    return null;
  }
}

// A small store for useSyncExternalStore: the static HTML shows the signed-out
// view, and the browser reads the sign-in result once after hydration.
export type TeacherSessionState = { session: TeacherSession | null; message: string; ready: boolean };
const serverSessionState: TeacherSessionState = { session: null, message: '', ready: false };
let browserSessionState: TeacherSessionState | null = null;
const sessionListeners = new Set<() => void>();

export function subscribeTeacherSession(listener: () => void) {
  sessionListeners.add(listener);
  return () => { sessionListeners.delete(listener); };
}

export function serverTeacherSessionState() {
  return serverSessionState;
}

export function teacherSessionState(): TeacherSessionState {
  if (!browserSessionState) {
    const result = takeSignInResult();
    browserSessionState = {
      session: result.session ?? (result.error ? null : storedTeacherSession()),
      message: result.error ? signInErrorMessage(result.error, result.login) : '',
      ready: true,
    };
  }
  return browserSessionState;
}

export function signOutTeacher(message: string) {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing stored.
  }
  browserSessionState = { session: null, message, ready: true };
  sessionListeners.forEach((listener) => listener());
}

export function signInErrorMessage(error: string, login?: string): string {
  if (error === 'not_allowed') return `The GitHub account ${login ?? ''} is not on the instructor list of this course. Ask the course maintainer to add it.`;
  if (error === 'denied') return 'GitHub sign-in was cancelled.';
  if (error === 'state') return 'The sign-in took too long or was started in another tab. Please try again.';
  if (error === 'not_configured') return 'Instructor sign-in is not set up on the course server yet.';
  return 'GitHub did not confirm the sign-in. Please try again.';
}
