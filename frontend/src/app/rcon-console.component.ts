import {DatePipe} from '@angular/common';
import {AfterViewChecked, Component, ElementRef, inject, signal, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';

import {RconApiService} from './rcon-api.service';
import {ServerSessionService} from './server-session.service';

interface ConsoleEntry {
  id: number;
  command: string;
  output: string;
  executedAt: string;
  pending?: boolean;
  error?: boolean;
}

@Component({
  selector: 'app-rcon-console',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './rcon-console.component.html',
})
export class RconConsoleComponent implements AfterViewChecked {
  readonly rconApi = inject(RconApiService);
  readonly session = inject(ServerSessionService);

  @ViewChild('terminalBody') private terminalBody?: ElementRef<HTMLElement>;

  command = '';
  readonly entries = signal<ConsoleEntry[]>([]);
  commandHistory: string[] = [];
  readonly sendingCommand = signal(false);
  private historyCursor = 0;
  private scrollConsoleAfterRender = false;
  private nextEntryId = 1;

  ngAfterViewChecked(): void {
    if (!this.scrollConsoleAfterRender) return;
    this.terminalBody?.nativeElement.scrollTo({ top: this.terminalBody.nativeElement.scrollHeight });
    this.scrollConsoleAfterRender = false;
  }

  sendCommand(): void {
    const command = this.command.trim();
    if (!command || this.sendingCommand()) return;

    this.sendingCommand.set(true);
    this.commandHistory.push(command);
    if (this.commandHistory.length > 50) this.commandHistory.shift();
    this.historyCursor = this.commandHistory.length;
    const entryId = this.nextEntryId++;
    this.addEntry({ id: entryId, command, output: 'Commande envoyée, en attente de la réponse…', executedAt: new Date().toISOString(), pending: true });
    this.rconApi.execute(command).subscribe({
      next: (response) => {
        this.session.updateFromCommand(response);
        this.replaceEntry(entryId, {
          id: entryId,
          command: response.command,
          output: response.output || 'Commande exécutée sans sortie.',
          executedAt: response.executedAt,
        });
        this.command = '';
        this.sendingCommand.set(false);
      },
      error: (error: unknown) => {
        this.replaceEntry(entryId, { id: entryId, command, output: this.getErrorMessage(error), executedAt: new Date().toISOString(), error: true });
        this.sendingCommand.set(false);
      },
    });
  }

  runQuickCommand(command: string): void {
    this.command = command;
    this.sendCommand();
  }

  handleCommandKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp' && this.commandHistory.length) {
      event.preventDefault();
      this.historyCursor = Math.max(0, this.historyCursor - 1);
      this.command = this.commandHistory[this.historyCursor];
    } else if (event.key === 'ArrowDown' && this.historyCursor < this.commandHistory.length) {
      event.preventDefault();
      this.historyCursor++;
      this.command = this.historyCursor === this.commandHistory.length ? '' : this.commandHistory[this.historyCursor];
    }
  }

  clearConsole(): void {
    this.entries.set([]);
  }

  private addEntry(entry: ConsoleEntry): void {
    this.entries.update((entries) => [...entries.slice(-99), entry]);
    this.scrollConsoleAfterRender = true;
  }

  private replaceEntry(id: number, entry: ConsoleEntry): void {
    this.entries.update((entries) => entries.map((existing) => existing.id === id ? entry : existing));
    this.scrollConsoleAfterRender = true;
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
