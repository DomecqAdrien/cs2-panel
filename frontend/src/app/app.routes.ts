import { Routes } from '@angular/router';

import { DashboardComponent } from './dashboard.component';
import { RconConsoleComponent } from './rcon-console.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent, title: 'Vue d’ensemble · CS2 Panel' },
  { path: 'console', component: RconConsoleComponent, title: 'Console RCON · CS2 Panel' },
  { path: '**', redirectTo: '' },
];
