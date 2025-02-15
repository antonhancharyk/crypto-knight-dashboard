import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subject,Subscription } from 'rxjs';
import { switchMap, takeUntil, tap } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { DateTime } from 'luxon';
import {FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';

import { CommonService, TracksServices, BinancePriceService, AuthService, BinanceWebSocketService } from '../../services';
import { Track } from '../../entities/track';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatDatepickerModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSelectModule,
    MatIconModule,
    MatCheckboxModule,
    MatAutocompleteModule,
    CommonModule,
    MatInputModule,
    MatExpansionModule,
  ],
  providers: [
    CommonService,
    TracksServices,
    provideNativeDateAdapter(),
    BinancePriceService,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  constructor(
    private tracksService: TracksServices,
    private authService: AuthService,
    private wsService: BinanceWebSocketService
  ) {}

  private destroy$ = new Subject<void>();
  tracks$: Observable<Track[]> = new Observable();
  prices: { [key: string]: number } = {};
  private subscription!: Subscription;

  ngOnInit() {
    this.tracks$ = this.authService.isAuthReady$.pipe(
      switchMap((isActive) => {
        if (!isActive || !this.authService.getToken()) {
          return new Observable<Track[]>()
        }; 
        return this.getTracks();
      }),
      takeUntil(this.destroy$)
    );

    this.subscription = this.wsService.connect().subscribe((data) => {
      data.forEach((ticker: any) => {
        this.prices[ticker.s] = parseFloat(ticker.c); 
      });
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscription.unsubscribe();
    this.wsService.close();
  }

  getTracks(): Observable<Track[]> {
    const now = DateTime.local().minus({ hours: 3 });
    const from = now.set({ minute: 0, second: 0 }).toFormat('yyyy-MM-dd HH:mm:ss');
    const to = now.set({ minute: 59, second: 59 }).toFormat('yyyy-MM-dd HH:mm:ss');

    return this.tracksService.getTracks({ from, to, symbol: '', full: true }).pipe(
      tap((tracks) => {
        tracks.forEach((item) => {
          const date = DateTime.fromISO(item.createdAt, { zone: 'utc' }).setZone('UTC+3');
          item.createdAt = date.toFormat('yyyy-MM-dd HH:mm');
        });
      })
    );
  }

  percentageChange(value: number, base: number): string {
    if (!value || !base) {
      return ''
    }
    
    const diff = ((value - base) / base) * 100;
    return diff.toFixed(2) + '%';
  }
}
