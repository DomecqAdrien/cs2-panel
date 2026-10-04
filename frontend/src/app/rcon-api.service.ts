import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

export interface RconCredentials {
  serverIp: string;
  serverPort: number;
  rconPassword: string;
}

export interface RconCommandResponse {
  command: string;
  output: string;
  executedAt: string;
}

@Injectable({ providedIn: 'root' })
export class RconApiService {
  private static readonly SESSION_KEY = 'cs2-panel.rcon-session';
  private readonly http = inject(HttpClient);

  readonly activeCredentials = signal<RconCredentials | null>(null);

  restoreSavedCredentials(): RconCredentials | null {
    try {
      const stored = sessionStorage.getItem(RconApiService.SESSION_KEY);
      if (!stored) return null;

      const credentials: unknown = JSON.parse(stored);
      if (!this.isRconCredentials(credentials)) {
        this.clearSavedCredentials();
        return null;
      }
      return credentials;
    } catch {
      this.clearSavedCredentials();
      return null;
    }
  }

  clearSavedCredentials(): void {
    try {
      sessionStorage.removeItem(RconApiService.SESSION_KEY);
    } catch {
      // Storage can be unavailable in private browsing or restricted browser contexts.
    }
  }

  connect(credentials: RconCredentials): Observable<RconCommandResponse> {
    return this.executeWithCredentials('status', credentials).pipe(
      tap(() => {
        this.activeCredentials.set({ ...credentials });
        try {
          sessionStorage.setItem(RconApiService.SESSION_KEY, JSON.stringify(credentials));
        } catch {
          // Keep the connection working for this page even if browser storage is unavailable.
        }
      }),
    );
  }

  execute(command: string): Observable<RconCommandResponse> {
    const credentials = this.activeCredentials();
    if (!credentials) {
      throw new Error('Connecte-toi au serveur avant d’envoyer une commande.');
    }
    return this.executeWithCredentials(command, credentials);
  }

  disconnect(): void {
    this.activeCredentials.set(null);
    this.clearSavedCredentials();
  }

  private isRconCredentials(value: unknown): value is RconCredentials {
    if (typeof value !== 'object' || value === null) return false;
    const credentials = value as Partial<RconCredentials>;
    return typeof credentials.serverIp === 'string'
      && typeof credentials.serverPort === 'number'
      && Number.isInteger(credentials.serverPort)
      && credentials.serverPort >= 1
      && credentials.serverPort <= 65535
      && typeof credentials.rconPassword === 'string'
      && credentials.rconPassword.length > 0;
  }

  private executeWithCredentials(command: string, credentials: RconCredentials): Observable<RconCommandResponse> {
    return this.http.post<RconCommandResponse>('/api/rcon/commands', {
      serverIp: credentials.serverIp,
      serverPort: credentials.serverPort,
      command,
      rconPassword: credentials.rconPassword,
    }, { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) });
  }
}
