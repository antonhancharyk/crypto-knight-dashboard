import { Routes } from '@angular/router';

import { HomeComponent, HistoryComponent, SettingsComponent } from '../pages';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'history', component: HistoryComponent },
  { path: 'settings', component: SettingsComponent },
];
