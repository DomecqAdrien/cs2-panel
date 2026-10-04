import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RconApiService, RconCommandResponse } from './rcon-api.service';
import {DatePipe} from "@angular/common";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly rconApi = inject(RconApiService);

  serverIp = '';
  serverPort = 27015;
  rconPassword = '';
  command = '';
  lastResponse: RconCommandResponse | null = null;
  connectionError = '';
  commandError = '';
  connecting = false;
  sendingCommand = false;

  connect(): void {
    this.connectionError = '';
    this.connecting = true;

    this.rconApi.connect({
      serverIp: this.serverIp.trim(),
      serverPort: this.serverPort,
      rconPassword: this.rconPassword,
    }).subscribe({
      next: (response) => {
        this.lastResponse = response;
        this.connecting = false;
        this.rconPassword = '';
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
    this.rconApi.disconnect();
    this.lastResponse = null;
    this.connectionError = '';
    this.commandError = '';
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
