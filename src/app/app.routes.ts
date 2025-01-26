import { Routes } from '@angular/router';

import { HomeComponent, SettingsComponent } from '../pages';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'settings', component: SettingsComponent },
];
