import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EMPTY, Subscription, catchError, forkJoin, of, switchMap, timer } from 'rxjs';

import { RconApiService, RconCommandResponse } from './rcon-api.service';
import {DatePipe} from "@angular/common";

interface LiveServerInfo {
  map: string | null;
  players: number | null;
  humans: number | null;
  bots: number | null;
  maxPlayers: number | null;
  gameMode: string | null;
  updatedAt: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  readonly rconApi = inject(RconApiService);

  serverAddress = '';
  rconPassword = '';
  command = '';
  lastResponse: RconCommandResponse | null = null;
  readonly serverInfo = signal<LiveServerInfo | null>(null);
  readonly statusRefreshError = signal('');
  connectionError = '';
  commandError = '';
  connecting = false;
  sendingCommand = false;
  private statusPolling: Subscription | null = null;

  ngOnInit(): void {
    const savedCredentials = this.rconApi.restoreSavedCredentials();
    if (!savedCredentials) return;

    this.serverAddress = `${savedCredentials.serverIp}:${savedCredentials.serverPort}`;
    this.rconPassword = savedCredentials.rconPassword;
    this.connectWithCredentials(savedCredentials);
  }

  get parsedServerAddress(): { serverIp: string; serverPort: number } | null {
    const match = /^((?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?::(\d{1,5}))?)$/.exec(this.serverAddress.trim());
    if (!match) return null;

    const [serverIp, portText] = match[1].split(':');
    const serverPort = portText ? Number(portText) : 27015;
    if (serverPort < 1 || serverPort > 65535) return null;

    return { serverIp, serverPort };
  }

  get playerSummary(): string {
    const info = this.serverInfo();
    if (!info || info.humans === null || info.bots === null) {
      return 'Données joueurs indisponibles';
    }
    return `${info.humans} humains · ${info.bots} bots`;
  }

  connect(): void {
    this.connectionError = '';
    const server = this.parsedServerAddress;
    if (!server) {
      this.connectionError = 'Saisis une adresse au format IP:port, par exemple 203.0.113.42:27015.';
      return;
    }

    this.rconApi.clearSavedCredentials();
    this.connectWithCredentials({
      ...server,
      rconPassword: this.rconPassword,
    });
  }

  private connectWithCredentials(credentials: { serverIp: string; serverPort: number; rconPassword: string }): void {
    this.connectionError = '';
    this.connecting = true;

    this.rconApi.connect(credentials).subscribe({
      next: (response) => {
        this.lastResponse = response;
        this.updateServerInfo(response);
        this.connecting = false;
        this.rconPassword = '';
        this.startStatusPolling();
      },
      error: (error: unknown) => {
        this.connectionError = this.getErrorMessage(error);
        this.connecting = false;
      },
    });
  }

  sendCommand(): void {
    const command = this.command.trim();
    if (!command || this.sendingCommand) return;

    this.commandError = '';
    this.sendingCommand = true;
    this.rconApi.execute(command).subscribe({
      next: (response) => {
        this.lastResponse = response;
        if (command.toLowerCase() === 'status') this.updateServerInfo(response);
        this.command = '';
        this.sendingCommand = false;
      },
      error: (error: unknown) => {
        this.commandError = this.getErrorMessage(error);
        this.sendingCommand = false;
      },
    });
  }

  disconnect(): void {
    this.stopStatusPolling();
    this.rconApi.disconnect();
    this.lastResponse = null;
    this.serverInfo.set(null);
    this.statusRefreshError.set('');
    this.connectionError = '';
    this.commandError = '';
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

  private updateServerInfo(
    status: RconCommandResponse,
    gameTypeOutput = '',
    gameModeOutput = '',
  ): void {
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
      players: humans !== null && bots !== null
        ? humans + bots
        : previous?.players ?? null,
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
      '0:0': 'Casual',
      '0:1': 'Compétitif',
      '0:2': 'Wingman',
      '0:3': 'Expert des armes',
      '0:4': 'Training Day',
      '1:0': 'Course à l’armement',
      '1:1': 'Démolition',
      '1:2': 'Match à mort',
      '2:0': 'Entraînement',
      '3:0': 'Personnalisé',
      '4:0': 'Gardien',
      '4:1': 'Frappe coopérative',
      '5:0': 'Guerre',
      '6:0': 'Danger Zone',
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
