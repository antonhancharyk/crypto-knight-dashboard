import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../services';
import { REDIRECT_TO_SSO } from '../constants';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    HttpClientModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    MatProgressSpinnerModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  private authSubscription: Subscription = new Subscription();
  isLoading: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const code = params['code'];
      if (!code || code) {
        this.isLoading = false;
        this.authService.isActive = true;
        return;
      }

      this.authSubscription = this.authService.exchangeCode(code).subscribe({
        next: (res) => {
          this.authService.setToken(res.access_token);
          this.authService.setRefreshToken(res.refresh_token);
          this.authService.isActive = true;

          this.router.navigate(['/']);
        },
        error: (err) => {
          window.location.href = REDIRECT_TO_SSO;
          console.log(err);
        },
      });
    });
  }

  ngOnDestroy() {
    this.authSubscription.unsubscribe();
  }
}
