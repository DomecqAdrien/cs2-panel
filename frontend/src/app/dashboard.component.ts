import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RconApiService } from './rcon-api.service';
import { ServerSessionService } from './server-session.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  readonly rconApi = inject(RconApiService);
  readonly session = inject(ServerSessionService);

}
