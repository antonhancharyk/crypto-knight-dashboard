import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Observable, Subject, forkJoin, Subscription } from 'rxjs';
import { switchMap, takeUntil, map } from 'rxjs/operators';
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
import { MatDialog } from '@angular/material/dialog';

import {
  CommonService,
  TracksServices,
  BinancePriceService,
  AuthService,
  BinanceWebSocketService,
  BinanceBalanceService,
  BinanceKlineService,
} from '../../services';
import { Track } from '../../entities/track';
import { Balance } from '../../entities/balance';
import { Kline } from '../../entities/kline';
import { KlineSeriesChartComponent } from '../../features/binance/kline-series-chart/kline-series-chart.component';
import { ModalComponent } from '../../components/modal/modal.component';

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
  providers: [
    CommonService,
    TracksServices,
    provideNativeDateAdapter(),
    BinancePriceService,
    BinanceBalanceService,
    BinanceKlineService,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  tracks$: Observable<Track[]> = new Observable();
  tracks: Track[] = [];
  prices: { [key: string]: number } = {};
  countPositions: number = 0;
  countReadyTracks: number = 0;
  countLongPositions: number = 0;
  countShortPositions: number = 0;
  countGoodPositions: number = 0;
  countBadPositions: number = 0;
  balance: Balance = {
    accountAlias: '',
    asset: '',
    crossWalletBalance: '',
    balance: '',
    crossUnPnl: '',
    availableBalance: '',
    maxWithdrawAmount: '',
    marginAvailable: true,
    updateTime: 0,
  };
  dialog = inject(MatDialog);
  isLoadingKlines: boolean = false;
  private klineSub?: Subscription;

  constructor(
    private tracksService: TracksServices,
    private authService: AuthService,
    private wsService: BinanceWebSocketService,
    private priceService: BinancePriceService,
    private balanceService: BinanceBalanceService,
    private klineService: BinanceKlineService,
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
          prices: this.priceService.getPrices(),
          balance: this.balanceService.getBalance(),
        }).pipe(
          map(({ tracks, positions, prices, balance }) => {
            const uniqueTracks = Array.from(
              new Map(tracks.map((item) => [item.symbol, item])).values(),
            );

            const positionTracks = Object.values(positions)
              .map((item) => {
                const track = uniqueTracks.find((track) => track.symbol === item.symbol);
                return { ...item, ...track, isOrder: true };
              })
              .sort((a, b) => a.symbol.localeCompare(b.symbol)) as unknown as Track[];

            const restTracks = uniqueTracks
              .filter((item) => {
                return !positions[item.symbol] && (item.highPrice !== 0 || item.lowPrice !== 0);
              })
              .sort((a, b) => a.symbol.localeCompare(b.symbol));

            this.countPositions = positionTracks.length;
            this.countLongPositions = positionTracks.filter((item) => {
              return +(item.positionAmt as string) > 0;
            }).length;
            this.countShortPositions = positionTracks.filter((item) => {
              return +(item.positionAmt as string) < 0;
            }).length;
            this.countReadyTracks = restTracks.length;
            prices.forEach((price) => {
              this.prices[price.symbol] = price.price;
            });
            const positions2 = positionTracks.map((item) => this.getColorPositionPercentage(item));
            this.countGoodPositions = positions2.filter((item) => item === 'green').length;
            this.countBadPositions = positions2.filter((item) => item === 'red').length;

            this.balance = balance;

            this.tracks = [...positionTracks, ...restTracks];

            return this.tracks;
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

        const positions = this.tracks
          .filter((item) => item.isOrder)
          .map((item) => this.getColorPositionPercentage(item));
        this.countGoodPositions = positions.filter((item) => item === 'green').length;
        this.countBadPositions = positions.filter((item) => item === 'red').length;
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

  getColorTrackDirection(item: Track): string {
    const highDiff = this.getPercentageDiff(item.highPrice, this.prices[item.symbol]) <= 1;
    const lowDiff = this.getPercentageDiff(item.lowPrice, this.prices[item.symbol]) <= 1;

    if (!item.isOrder && highDiff) {
      return '#ebffe8';
    }
    if (!item.isOrder && lowDiff) {
      return '#ebd4d4';
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

  openKlineChart(item: Track) {
    this.klineSub?.unsubscribe();

    this.isLoadingKlines = true;

    this.klineSub = this.klineService
      .getKlines(item.symbol)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (klines: Kline[]) => {
          this.dialog.open(ModalComponent, {
            data: {
              component: KlineSeriesChartComponent,
              componentInputs: {
                klines,
                track: item,
                current: this.prices[item.symbol],
              },
            },
          });
        },
        error: () => {
          this.isLoadingKlines = false;
        },
        complete: () => {
          this.isLoadingKlines = false;
        },
      });
  }
}
