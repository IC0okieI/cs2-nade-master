import { Routes } from '@angular/router';
import { AdminPanelComponent } from './admin-panel/admin-panel.component';
import { MainPanelComponent } from './main-panel/main-panel.component';

export const routes: Routes = [
  { path: '', component: MainPanelComponent },
  { path: 'admin', component: AdminPanelComponent }
];
