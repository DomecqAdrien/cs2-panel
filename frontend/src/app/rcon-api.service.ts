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
    return this.http.post<RconCommandResponse>('/api/rcon/commands', {
      serverIp: credentials.serverIp,
      serverPort: credentials.serverPort,
      command,
      rconPassword: credentials.rconPassword,
    }, { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) });
  }
}
