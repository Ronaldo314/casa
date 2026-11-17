import { Usuario } from '../types';

export interface ActiveUserPresence {
  id: string;
  user: Usuario;
  activeModule: string;
  activeLine: string;
  connectedAt: string;
}

export interface LiveNotification {
  id: string;
  title: string;
  message: string;
  user: string;
  timestamp: string;
}

interface PendingMutation {
  mutationId: string;
  entity: string;
  action: string;
  data: any;
  shiftSubsequent?: boolean;
  user: Usuario | null;
  createdAt: number;
}

type StateUpdateListener = (entity: string, action: string, data: any, fullState?: any) => void;
type PresenceListener = (users: ActiveUserPresence[]) => void;
type NotificationListener = (notification: LiveNotification) => void;
type ConnectionListener = (connected: boolean) => void;
type LocalMutationListener = (entity: string, action: string) => void;

const PENDING_MUTATIONS_KEY = 'st_pending_mutations_v1';

class RealtimeService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 2;
  private currentUser: Usuario | null = null;
  private currentModule = 'dashboard';
  private currentLine = 'TODAS';
  private clientId: string;

  private stateListeners: Set<StateUpdateListener> = new Set();
  private presenceListeners: Set<PresenceListener> = new Set();
  private notificationListeners: Set<NotificationListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private localMutationListeners: Set<LocalMutationListener> = new Set();

  private activeUsers: ActiveUserPresence[] = [];
  private heartbeatInterval: any = null;
  private pollingInterval: any = null;
  private lastKnownVersion = 0;
  private lastSeenAuditId = '';

  private pendingQueue: PendingMutation[] = [];
  private flushPromise: Promise<boolean> | null = null;
  private isSessionActive = false;

  constructor() {
    // Generate or retrieve persistent tab client ID
    try {
      let storedId = sessionStorage.getItem('st_realtime_client_id');
      if (!storedId) {
        storedId = 'CLI-' + Math.random().toString(36).substring(2, 9);
        sessionStorage.setItem('st_realtime_client_id', storedId);
      }
      this.clientId = storedId;
    } catch {
      this.clientId = 'CLI-' + Math.random().toString(36).substring(2, 9);
    }

    this.loadPendingQueue();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        void this.flushPendingMutations();
      });
    }
  }

  private loadPendingQueue() {
    try {
      const raw = localStorage.getItem(PENDING_MUTATIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.pendingQueue = parsed;
        }
      }
    } catch {
      this.pendingQueue = [];
    }
  }

  private savePendingQueue() {
    try {
      if (this.pendingQueue.length === 0) {
        localStorage.removeItem(PENDING_MUTATIONS_KEY);
      } else {
        localStorage.setItem(PENDING_MUTATIONS_KEY, JSON.stringify(this.pendingQueue));
      }
    } catch {
      // ignore storage quota errors
    }
  }

  private resolveFallbackUser(): Usuario | null {
    if (this.currentUser) return this.currentUser;
    try {
      const saved = localStorage.getItem('st_auth_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  }

  public hasPendingMutations(): boolean {
    return this.pendingQueue.length > 0;
  }

  public connect(user?: Usuario) {
    if (user) {
      this.currentUser = user;
    }
    this.isSessionActive = true;
    this.reconnectAttempts = 0;

    // Flush any queued mutations immediately upon connecting
    void this.flushPendingMutations();

    // Always start resilient HTTP polling fallback immediately
    this.startPollingFallback();

    // In browser environments with WebSocket support, attempt WebSocket connection
    if (typeof window !== 'undefined' && typeof WebSocket !== 'undefined') {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        return;
      }

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        return;
      }

      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.notifyConnection(true);

          if (this.currentUser) {
            this.identify(this.currentUser, this.currentModule, this.currentLine);
          }

          this.startHeartbeat();
        };

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            this.handleServerMessage(msg);
          } catch {
            // ignore non-json
          }
        };

        this.ws.onclose = () => {
          this.stopHeartbeat();
          if (this.isSessionActive && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
              if (this.isSessionActive) this.connect();
            }, 4000);
          }
        };

        this.ws.onerror = () => {
          this.ws = null;
        };
      } catch {
        // Handled gracefully
      }
    }
  }

  public disconnect() {
    this.isSessionActive = false;
    this.stopHeartbeat();
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    const prevClientId = this.clientId;
    this.currentUser = null;
    this.isConnected = false;
    this.lastKnownVersion = 0;
    this.notifyConnection(false);

    // Notify server of logout for presence cleanup (without losing pending mutations)
    if (typeof fetch !== 'undefined') {
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: prevClientId, logout: true }),
        keepalive: true
      }).catch(() => {});
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentUser) {
        this.ws.send(JSON.stringify({
          type: 'presence:heartbeat',
          activeModule: this.currentModule,
          activeLine: this.currentLine
        }));
      }
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Resilient Polling Fallback ensures multi-user sync and presence continue seamlessly
   * even behind reverse proxies or iframes where WebSocket upgrades are blocked.
   */
  private startPollingFallback() {
    if (this.pollingInterval) return;

    // Initial immediate poll
    void this.pollServer();

    // Recurring poll every 3 seconds
    this.pollingInterval = setInterval(() => {
      void this.pollServer();
    }, 3000);
  }

  private async pollServer() {
    // Always attempt to flush pending mutations first so local writes are never lost
    if (this.pendingQueue.length > 0) {
      const flushed = await this.flushPendingMutations();
      if (!flushed || this.pendingQueue.length > 0) {
        return;
      }
    }

    if (!this.isSessionActive || !this.currentUser) {
      return;
    }

    try {
      const res = await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: this.clientId,
          user: this.currentUser,
          activeModule: this.currentModule,
          activeLine: this.currentLine
        })
      });

      if (!res.ok) return;

      const data = await res.json();

      if (!this.isConnected) {
        this.isConnected = true;
        this.notifyConnection(true);
      }

      if (data.activeUsers && Array.isArray(data.activeUsers)) {
        this.activeUsers = data.activeUsers;
        this.notifyPresence(this.activeUsers);
      }

      // Check if server version has updated and no local mutations are pending
      if (data.version && data.version > this.lastKnownVersion && this.pendingQueue.length === 0) {
        const isFirstRun = this.lastKnownVersion === 0;
        this.lastKnownVersion = data.version;

        if (!isFirstRun) {
          const stateRes = await fetch('/api/state');
          if (stateRes.ok && this.pendingQueue.length === 0) {
            const fullState = await stateRes.json();
            this.notifyState('all', 'init', fullState, fullState);

            // Notify if changes were made by another user
            if (data.lastAudit && data.lastAudit.id_auditoria !== this.lastSeenAuditId) {
              this.lastSeenAuditId = data.lastAudit.id_auditoria;
              const isDifferentUser = !this.currentUser || !data.lastAudit.usuario?.includes(this.currentUser.nombres);
              if (isDifferentUser) {
                this.notifyNotification({
                  id: 'NOTIF-' + Date.now(),
                  title: `Actualización: ${data.lastAudit.modulo}`,
                  message: data.lastAudit.valores_nuevos || 'Datos actualizados en el sistema',
                  user: `${data.lastAudit.usuario} (${data.lastAudit.rol})`,
                  timestamp: data.lastAudit.hora || 'Ahora'
                });
              }
            }
          }
        }
      }
    } catch {
      // Offline or network transient error
    }
  }

  public identify(user: Usuario, activeModule?: string, activeLine?: string) {
    this.currentUser = user;
    if (activeModule) this.currentModule = activeModule;
    if (activeLine) this.currentLine = activeLine;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'auth:identify',
        user: {
          id_usuario: user.id_usuario,
          nombres: user.nombres,
          apellidos: user.apellidos,
          username: user.username,
          rol: user.rol,
          email: user.email
        },
        activeModule: this.currentModule,
        activeLine: this.currentLine
      }));
    }

    if (this.isSessionActive) {
      void this.pollServer();
    }
  }

  public updatePresence(moduleName: string, lineCode: string) {
    this.currentModule = moduleName;
    this.currentLine = lineCode;

    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentUser) {
      this.ws.send(JSON.stringify({
        type: 'presence:heartbeat',
        activeModule: moduleName,
        activeLine: lineCode
      }));
    }

    if (this.isSessionActive) {
      void this.pollServer();
    }
  }

  private handleServerMessage(msg: any) {
    switch (msg.type) {
      case 'init': {
        if (msg.activeUsers) {
          this.activeUsers = msg.activeUsers;
          this.notifyPresence(this.activeUsers);
        }
        // Protect un-acknowledged local mutations from being overwritten by stale WS init
        if (this.pendingQueue.length > 0) {
          break;
        }
        if (msg.data && msg.data.version) {
          this.lastKnownVersion = Math.max(this.lastKnownVersion, msg.data.version);
        }
        this.notifyState('all', 'init', msg.data, msg.data);
        break;
      }

      case 'presence:update': {
        this.activeUsers = msg.activeUsers || [];
        this.notifyPresence(this.activeUsers);
        break;
      }

      case 'state:patch': {
        if (msg.version) {
          this.lastKnownVersion = Math.max(this.lastKnownVersion, msg.version);
        }
        this.notifyState(msg.entity, msg.action, msg.data);
        if (msg.notification) {
          this.notifyNotification({
            id: 'NOTIF-' + Date.now(),
            title: msg.notification.title,
            message: msg.notification.message,
            user: msg.notification.user,
            timestamp: msg.notification.timestamp
          });
        }
        break;
      }

      case 'sync:complete': {
        this.notifyNotification({
          id: 'NOTIF-SYNC-' + Date.now(),
          title: 'Sincronización de Google Drive Completada',
          message: `Datos actualizados a las ${msg.last_sync_time}`,
          user: 'Servidor Drive Sync',
          timestamp: msg.last_sync_time
        });
        break;
      }
    }
  }

  /**
   * Queue and persist a mutation reliably via REST POST /api/mutate (with automatic retry & keepalive).
   * Uses a single authoritative persistence channel so records are never duplicated or dropped.
   */
  public mutate(entity: string, action: string, data: any, shiftSubsequent?: boolean) {
    const mutation: PendingMutation = {
      mutationId: 'MUT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
      entity,
      action,
      data,
      shiftSubsequent,
      user: this.resolveFallbackUser(),
      createdAt: Date.now()
    };

    this.pendingQueue.push(mutation);
    this.savePendingQueue();

    void this.flushPendingMutations();
  }

  public async flushPendingMutations(): Promise<boolean> {
    if (this.pendingQueue.length === 0) return true;
    if (this.flushPromise) return this.flushPromise;

    this.flushPromise = (async () => {
      try {
        while (this.pendingQueue.length > 0) {
          const next = this.pendingQueue[0];
          const res = await fetch('/api/mutate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'mutate',
              mutationId: next.mutationId,
              entity: next.entity,
              action: next.action,
              data: next.data,
              shiftSubsequent: next.shiftSubsequent,
              user: next.user || this.resolveFallbackUser()
            }),
            keepalive: true
          });

          if (!res.ok) {
            // Leave in queue to retry unless it's a permanent 400 payload error
            if (res.status >= 400 && res.status < 500) {
              this.pendingQueue.shift();
              this.savePendingQueue();
              continue;
            }
            return false;
          }

          const json = await res.json().catch(() => ({ success: true }));
          if (json && json.success === false) {
            return false;
          }

          if (json?.version) {
            this.lastKnownVersion = Math.max(this.lastKnownVersion, json.version);
          }

          this.pendingQueue.shift();
          this.savePendingQueue();

          for (const fn of this.localMutationListeners) {
            try { fn(next.entity, next.action); } catch {}
          }
        }
        return true;
      } catch {
        return false;
      } finally {
        this.flushPromise = null;
      }
    })();

    return this.flushPromise;
  }

  /**
   * Flush any pending local mutations first, then fetch the authoritative server state.
   * Returns null if local mutations could not yet be flushed (so local data is never overwritten).
   */
  public async fetchAuthoritativeState(): Promise<any | null> {
    const flushed = await this.flushPendingMutations();
    if (!flushed || this.pendingQueue.length > 0) {
      return null;
    }

    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (!res.ok) return null;
      const fullState = await res.json();
      if (this.pendingQueue.length > 0) {
        return null;
      }
      if (fullState?.version) {
        this.lastKnownVersion = Math.max(this.lastKnownVersion, fullState.version);
      }
      return fullState;
    } catch {
      return null;
    }
  }

  // --- Listeners Subscriptions ---
  public onStateUpdate(fn: StateUpdateListener): () => void {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }

  public onPresence(fn: PresenceListener): () => void {
    this.presenceListeners.add(fn);
    if (this.activeUsers.length > 0) fn(this.activeUsers);
    return () => this.presenceListeners.delete(fn);
  }

  public onNotification(fn: NotificationListener): () => void {
    this.notificationListeners.add(fn);
    return () => this.notificationListeners.delete(fn);
  }

  public onConnectionChange(fn: ConnectionListener): () => void {
    this.connectionListeners.add(fn);
    fn(this.isConnected);
    return () => this.connectionListeners.delete(fn);
  }

  public onLocalMutation(fn: LocalMutationListener): () => void {
    this.localMutationListeners.add(fn);
    return () => this.localMutationListeners.delete(fn);
  }

  private notifyState(entity: string, action: string, data: any, fullState?: any) {
    for (const fn of this.stateListeners) {
      fn(entity, action, data, fullState);
    }
  }

  private notifyPresence(users: ActiveUserPresence[]) {
    for (const fn of this.presenceListeners) {
      fn(users);
    }
  }

  private notifyNotification(notif: LiveNotification) {
    for (const fn of this.notificationListeners) {
      fn(notif);
    }
  }

  private notifyConnection(connected: boolean) {
    for (const fn of this.connectionListeners) {
      fn(connected);
    }
  }

  public getActiveUsers(): ActiveUserPresence[] {
    return this.activeUsers;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const realtimeService = new RealtimeService();
