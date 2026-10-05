import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, Observable, Subscription, catchError, forkJoin, of, switchMap, tap, timer } from 'rxjs';

import { RconApiService, RconCommandResponse, RconCredentials } from './rcon-api.service';

export interface LiveServerInfo {
  map: string | null;
  players: number | null;
  humans: number | null;
  bots: number | null;
  maxPlayers: number | null;
  gameMode: string | null;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ServerSessionService {
  private readonly rconApi = inject(RconApiService);
  private statusPolling: Subscription | null = null;

  readonly serverInfo = signal<LiveServerInfo | null>(null);
  readonly statusRefreshError = signal('');
  readonly connectionError = signal('');
  readonly connecting = signal(false);
  readonly lastResponse = signal<RconCommandResponse | null>(null);

  restoreSavedSession(): RconCredentials | null {
    const credentials = this.rconApi.restoreSavedCredentials();
    if (credentials) this.connect(credentials).subscribe();
    return credentials;
  }

  connect(credentials: RconCredentials): Observable<RconCommandResponse> {
    this.connectionError.set('');
    this.connecting.set(true);
    return this.rconApi.connect(credentials).pipe(
      tap((response) => {
        this.lastResponse.set(response);
        this.updateServerInfo(response);
        this.connecting.set(false);
        this.startStatusPolling();
      }),
      catchError((error: unknown) => {
        this.connectionError.set(this.getErrorMessage(error));
        this.connecting.set(false);
        return EMPTY;
      }),
    );
  }

  disconnect(): void {
    this.stopStatusPolling();
    this.rconApi.disconnect();
    this.lastResponse.set(null);
    this.serverInfo.set(null);
    this.statusRefreshError.set('');
    this.connectionError.set('');
  }

  updateFromCommand(response: RconCommandResponse): void {
    this.lastResponse.set(response);
    if (response.command.trim().toLowerCase() === 'status') this.updateServerInfo(response);
  }

  get playerSummary(): string {
    const info = this.serverInfo();
    if (!info || info.humans === null || info.bots === null) return 'Données joueurs indisponibles';
    return `${info.humans} humains · ${info.bots} bots`;
  }

  private startStatusPolling(): void {
    this.stopStatusPolling();
    this.statusPolling = timer(0, 5_000).pipe(
      switchMap(() => forkJoin({
        status: this.rconApi.execute('status'),
        gameType: this.rconApi.execute('game_type').pipe(catchError(() => of(null))),
        gameMode: this.rconApi.execute('game_mode').pipe(catchError(() => of(null))),
      }).pipe(catchError((error: unknown) => {
        this.statusRefreshError.set(this.getErrorMessage(error));
        return EMPTY;
      }))),
    ).subscribe(({ status, gameType, gameMode }) => {
      this.updateServerInfo(status, gameType?.output ?? '', gameMode?.output ?? '');
      this.statusRefreshError.set('');
    });
  }

  private stopStatusPolling(): void {
    this.statusPolling?.unsubscribe();
    this.statusPolling = null;
  }

  private updateServerInfo(status: RconCommandResponse, gameTypeOutput = '', gameModeOutput = ''): void {
    const map = /\bmap\s*:\s*([^\s]+)/i.exec(status.output)?.[1] ?? null;
    const playerSummary = /\bplayers\s*:\s*(\d+)\s+humans?,\s*(\d+)\s+bots?\s*\((\d+)\s+max\)/i.exec(status.output);
    const humans = playerSummary ? Number(playerSummary[1]) : null;
    const bots = playerSummary ? Number(playerSummary[2]) : null;
    const maxPlayers = playerSummary ? Number(playerSummary[3]) : null;
    const gameType = this.readConVar(gameTypeOutput, 'game_type');
    const gameMode = this.readConVar(gameModeOutput, 'game_mode');
    const previous = this.serverInfo();

    this.serverInfo.set({
      map: map ?? previous?.map ?? null,
      humans: humans ?? previous?.humans ?? null,
      bots: bots ?? previous?.bots ?? null,
      players: humans !== null && bots !== null ? humans + bots : previous?.players ?? null,
      maxPlayers: maxPlayers ?? previous?.maxPlayers ?? null,
      gameMode: gameType !== null && gameMode !== null
        ? this.getGameModeName(gameType, gameMode)
        : previous?.gameMode ?? null,
      updatedAt: status.executedAt,
    });
  }

  private readConVar(output: string, name: string): number | null {
    const match = new RegExp(`\\b${name}\\b["']?\\s*=\\s*["']?(\\d+)`, 'i').exec(output);
    return match ? Number(match[1]) : null;
  }

  private getGameModeName(gameType: number, gameMode: number): string {
    const modes: Record<string, string> = {
      '0:0': 'Casual', '0:1': 'Compétitif', '0:2': 'Wingman', '0:3': 'Expert des armes', '0:4': 'Training Day',
      '1:0': 'Course à l’armement', '1:1': 'Démolition', '1:2': 'Match à mort', '2:0': 'Entraînement',
      '3:0': 'Personnalisé', '4:0': 'Gardien', '4:1': 'Frappe coopérative', '5:0': 'Guerre', '6:0': 'Danger Zone',
    };
    return modes[`${gameType}:${gameMode}`] ?? `Type ${gameType} · mode ${gameMode}`;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const detail = error.error?.detail;
      if (typeof detail === 'string' && detail.length > 0) return detail;
      if (error.status === 400) return error.error?.detail || 'Vérifie l’adresse IP et le port RCON.';
      if (error.status === 0) return 'Backend inaccessible. Vérifie qu’il est démarré.';
      return `La requête a échoué (HTTP ${error.status}).`;
    }
    return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
  }
}
