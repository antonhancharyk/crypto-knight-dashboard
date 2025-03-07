import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subject, forkJoin } from 'rxjs';
import { switchMap, takeUntil, tap, map } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { DateTime } from 'luxon';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import {
  CommonService,
  TracksServices,
  BinancePriceService,
  AuthService,
  BinanceWebSocketService,
} from '../../services';
import { Track } from '../../entities/track';
import { PositionRisk } from '../../entities/price';

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
    MatSlideToggleModule,
  ],
  providers: [CommonService, TracksServices, provideNativeDateAdapter(), BinancePriceService],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  tracks$: Observable<Track[]> = new Observable();
  prices: { [key: string]: number } = {};
  countPositions: number = 0;
  countReadyTracks: number = 0;

  constructor(
    private tracksService: TracksServices,
    private authService: AuthService,
    private wsService: BinanceWebSocketService,
    private priceService: BinancePriceService,
  ) {}

  ngOnInit() {
    this.tracks$ = this.authService.isAuthReady$.pipe(
      switchMap((isActive) => {
        if (!isActive || !this.authService.getToken()) {
          return new Observable<Track[]>();
        }

        const now = DateTime.local().minus({ hours: 3 });
        const from = now.set({ minute: 0, second: 0 }).toFormat('yyyy-MM-dd HH:mm:ss');
        const to = now.set({ minute: 59, second: 59 }).toFormat('yyyy-MM-dd HH:mm:ss');

        return forkJoin({
          tracks: this.tracksService.getTracks({ from, to, symbol: '', full: true }),
          positions: this.priceService.getPositions(),
        }).pipe(
          map(({ tracks, positions }) => {
            const positionTracks = tracks
              .filter((item) => {
                return positions[item.symbol];
              })
              .map((item) => {
                return {
                  ...positions[item.symbol],
                  ...item,
                  isOrder: true,
                };
              })
              .sort((a, b) => a.symbol.localeCompare(b.symbol));
            const restTracks = tracks
              .filter((item) => {
                return !positions[item.symbol] && (item.highPrice !== 0 || item.lowPrice !== 0);
              })
              .sort((a, b) => a.symbol.localeCompare(b.symbol));

            this.countPositions = positionTracks.length;
            this.countReadyTracks = restTracks.length;

            return [...positionTracks, ...restTracks];
          }),
        );
      }),
      takeUntil(this.destroy$),
    );

    this.wsService
      .connect()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        data.forEach((ticker: any) => {
          this.prices[ticker.s] = parseFloat(ticker.c);
        });
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.wsService.close();
  }

  getPercentageDiff(value: number, base: number): number {
    if (!value || !base) {
      return 100;
    }

    return Math.abs(((value - base) / base) * 100);
  }

  getDirection(item: Track): string {
    const highDiff = this.getPercentageDiff(item.highPrice, this.prices[item.symbol]) <= 2;
    const lowDiff = this.getPercentageDiff(item.lowPrice, this.prices[item.symbol]) <= 2;

    if (!item.isOrder && highDiff) {
      return '#ceffc2';
    }
    if (!item.isOrder && lowDiff) {
      return '#ffc2c2';
    }
    return '';
  }

  getColorPositionDirection(item: Track): string {
    const positionDirection = this.getPositionDirection(item);

    if (positionDirection === 'long') {
      return 'green';
    }
    if (positionDirection === 'short') {
      return 'red';
    }
    return '';
  }

  getPositionDirection(item: Track): string {
    const highDiff = +(item.positionAmt || 0) > 0;
    const lowDiff = +(item.positionAmt || 0) < 0;

    if (highDiff) {
      return 'long';
    }
    if (lowDiff) {
      return 'short';
    }
    return '';
  }

  getColorPositionPercentage(item: Track): string {
    const positionDirection = this.getPositionDirection(item);
    const entryPrice = +(item.entryPrice || 0);
    const cPrice = this.prices[item.symbol];

    if (positionDirection === 'long' && cPrice > entryPrice) {
      return 'green';
    }
    if (positionDirection === 'long' && cPrice < entryPrice) {
      return 'red';
    }
    if (positionDirection === 'short' && cPrice < entryPrice) {
      return 'green';
    }
    if (positionDirection === 'short' && cPrice > entryPrice) {
      return 'red';
    }
    return '';
  }
}
