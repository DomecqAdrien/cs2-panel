import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

export interface RconCredentials {
  serverIp: string;
  rconPassword: string;
  panelUsername: string;
  panelPassword: string;
}

export interface RconCommandResponse {
  command: string;
  output: string;
  executedAt: string;
}

@Injectable({ providedIn: 'root' })
export class RconApiService {
  private readonly http = inject(HttpClient);

  // Credentials live only in this in-memory service. They are never written to browser storage.
  readonly activeCredentials = signal<RconCredentials | null>(null);

  connect(credentials: RconCredentials): Observable<RconCommandResponse> {
    return this.executeWithCredentials('status', credentials).pipe(
      tap(() => this.activeCredentials.set({ ...credentials })),
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
  }

  private executeWithCredentials(command: string, credentials: RconCredentials): Observable<RconCommandResponse> {
    const encodedCredentials = new TextEncoder().encode(`${credentials.panelUsername}:${credentials.panelPassword}`);
    const binaryCredentials = Array.from(encodedCredentials, (byte) => String.fromCharCode(byte)).join('');
    const basicToken = btoa(binaryCredentials);
    const headers = new HttpHeaders({ Authorization: `Basic ${basicToken}` });
    return this.http.post<RconCommandResponse>('/api/rcon/commands', {
      serverIp: credentials.serverIp,
      command,
      rconPassword: credentials.rconPassword,
    }, { headers });
  }
}
