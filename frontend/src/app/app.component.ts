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
  panelUsername = 'admin';
  panelPassword = '';
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
      rconPassword: this.rconPassword,
      panelUsername: this.panelUsername.trim(),
      panelPassword: this.panelPassword,
    }).subscribe({
      next: (response) => {
        this.lastResponse = response;
        this.connecting = false;
        this.rconPassword = '';
        this.panelPassword = '';
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
      if (error.status === 401) return 'Accès au panneau refusé. Vérifie les identifiants du panneau.';
      if (error.status === 403) return 'Cette adresse IP ne correspond pas au serveur configuré.';
      if (error.status === 0) return 'Backend inaccessible. Vérifie qu’il est démarré.';
      return `La requête a échoué (HTTP ${error.status}).`;
    }
    return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
  }
}
