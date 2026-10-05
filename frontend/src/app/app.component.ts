import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { RconApiService, RconCredentials } from './rcon-api.service';
import { ServerSessionService } from './server-session.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  readonly rconApi = inject(RconApiService);
  readonly session = inject(ServerSessionService);

  serverAddress = '';
  rconPassword = '';

  ngOnInit(): void {
    const credentials = this.session.restoreSavedSession();
    if (credentials) this.serverAddress = `${credentials.serverIp}:${credentials.serverPort}`;
  }

  get parsedServerAddress(): Pick<RconCredentials, 'serverIp' | 'serverPort'> | null {
    const match = /^((?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?::(\d{1,5}))?)$/.exec(this.serverAddress.trim());
    if (!match) return null;

    const [serverIp, portText] = match[1].split(':');
    const serverPort = portText ? Number(portText) : 27015;
    return serverPort >= 1 && serverPort <= 65535 ? { serverIp, serverPort } : null;
  }

  connect(): void {
    const server = this.parsedServerAddress;
    if (!server) {
      this.session.connectionError.set('Saisis une adresse au format IP:port, par exemple 203.0.113.42:27015.');
      return;
    }

    this.rconApi.clearSavedCredentials();
    this.session.connect({ ...server, rconPassword: this.rconPassword })
      .subscribe(() => {
        this.rconPassword = '';
      });
  }

  disconnect(): void {
    this.session.disconnect();
    this.rconPassword = '';
  }
}
