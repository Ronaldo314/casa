import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.setCustomParameters({ prompt: 'select_account' });

export interface GoogleWorkspaceSession {
  user: User | null;
  hasAccessToken: boolean;
  driveWriteConfirmed: boolean;
  pendingSync: boolean;
  lastError: string | null;
}

// Strictly in-memory ONLY (never stored in localStorage / sessionStorage)
let cachedAccessToken: string | null = null;
let currentGoogleUser: User | null = null;
let driveWriteConfirmed = false;
let pendingSync = false;
let lastAuthError: string | null = null;
let listenerInitialized = false;

const listeners = new Set<(session: GoogleWorkspaceSession) => void>();

function notifyListeners() {
  const snapshot: GoogleWorkspaceSession = {
    user: currentGoogleUser,
    hasAccessToken: Boolean(cachedAccessToken),
    driveWriteConfirmed,
    pendingSync,
    lastError: lastAuthError
  };
  for (const fn of listeners) {
    try {
      fn(snapshot);
    } catch {
      // ignore listener errors
    }
  }
}

export function initGoogleWorkspaceAuth() {
  if (listenerInitialized) return;
  listenerInitialized = true;
  onAuthStateChanged(auth, (user) => {
    currentGoogleUser = user;
    if (!user) {
      cachedAccessToken = null;
      driveWriteConfirmed = false;
    }
    notifyListeners();
  });
}

export function subscribeGoogleWorkspaceAuth(
  fn: (session: GoogleWorkspaceSession) => void
): () => void {
  initGoogleWorkspaceAuth();
  listeners.add(fn);
  fn({
    user: currentGoogleUser,
    hasAccessToken: Boolean(cachedAccessToken),
    driveWriteConfirmed,
    pendingSync,
    lastError: lastAuthError
  });
  return () => {
    listeners.delete(fn);
  };
}

export async function googleSignInForWorkspace(): Promise<{
  success: boolean;
  user: User | null;
  accessToken: string | null;
  error?: string;
}> {
  initGoogleWorkspaceAuth();
  lastAuthError = null;
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    currentGoogleUser = result.user;

    if (!cachedAccessToken) {
      const msg = 'Google no devolvió el token de acceso OAuth para Drive/Sheets. Intente nuevamente.';
      lastAuthError = msg;
      notifyListeners();
      return { success: false, user: result.user, accessToken: null, error: msg };
    }

    notifyListeners();
    return {
      success: true,
      user: result.user,
      accessToken: cachedAccessToken
    };
  } catch (err: any) {
    const msg =
      err?.code === 'auth/popup-closed-by-user'
        ? 'Ventana de autorización de Google cerrada antes de completar el acceso.'
        : err?.message || 'Error al iniciar sesión con Google';
    lastAuthError = msg;
    notifyListeners();
    return { success: false, user: null, accessToken: null, error: msg };
  }
}

export async function googleLogoutFromWorkspace(): Promise<void> {
  cachedAccessToken = null;
  driveWriteConfirmed = false;
  lastAuthError = null;
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
  currentGoogleUser = null;
  notifyListeners();
}

export function getGoogleAccessToken(): string | null {
  return cachedAccessToken;
}

export function clearGoogleAccessTokenOnAuthError(): void {
  cachedAccessToken = null;
  driveWriteConfirmed = false;
  notifyListeners();
}

export function getGoogleSession(): GoogleWorkspaceSession {
  return {
    user: currentGoogleUser,
    hasAccessToken: Boolean(cachedAccessToken),
    driveWriteConfirmed,
    pendingSync,
    lastError: lastAuthError
  };
}

export function isDriveAutoSyncAuthorized(): boolean {
  return Boolean(cachedAccessToken && driveWriteConfirmed);
}

export function setDriveWriteConfirmed(confirmed: boolean): void {
  driveWriteConfirmed = confirmed;
  notifyListeners();
}

export function markPendingDriveSync(pending: boolean): void {
  pendingSync = pending;
  notifyListeners();
}
