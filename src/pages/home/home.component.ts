import { Component, OnDestroy, OnInit, inject, signal, computed, effect } from '@angular/core';
import { Subject, forkJoin, Subscription, of } from 'rxjs';
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
  BinanceOrderService,
} from '../../services';
import { Track, LastEntry } from '../../entities/track';
import { Order } from '../../entities/order';
import { Balance } from '../../entities/balance';
import { Kline } from '../../entities/kline';
import { Price, PositionRisk } from '../../entities/price';
import { KlineSeriesChartComponent } from '../../features/binance/kline-series-chart/kline-series-chart.component';
import { ModalComponent } from '../../components/modal/modal.component';
import {
  BTCUSDT,
  RESERVE_FACTOR,
  NEW_POSITION_RATIO,
  OLD_POSITION_RATIO,
  INITIAL_POSITION_SIZE_USDT,
  POSITION_SAFETY_FACTOR,
  SYMBOLS,
} from '../../constants';

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
    BinanceOrderService,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  tracks: Track[] = [];
  prices: { [key: string]: number } = {};
  countPositions: number = 0;
  countReadyTracks: number = 0;
  countLongPositions: number = 0;
  countShortPositions: number = 0;
  countGoodPositions: number = 0;
  countBadPositions: number = 0;
  // balanceState: Balance = {
  //   accountAlias: '',
  //   asset: '',
  //   crossWalletBalance: '',
  //   balance: '',
  //   crossUnPnl: '',
  //   availableBalance: '',
  //   maxWithdrawAmount: '',
  //   marginAvailable: true,
  //   updateTime: 0,
  // };
  dialog = inject(MatDialog);
  isLoadingKlines: boolean = false;
  isLoadingTracks: boolean = false;
  private klineSub?: Subscription;

  balance = signal<Balance | null>(null);
  positions = signal<PositionRisk[]>([]);
  // symbols = signal<string[]>([]);

  distributedBalance = computed(() => {
    const bal = this.balance();
    const pos = this.positions();

    if (!bal) return null;

    return this.distributeBalance(parseFloatSafe(bal.crossWalletBalance), pos);
  });

  positionSize = computed(() => {
    const dist = this.distributedBalance();
    const pos = this.positions();
    const syms = SYMBOLS;

    if (!dist) return 0;

    return this.calculatePositionSize(dist, pos, syms);
  });

  constructor(
    private tracksService: TracksServices,
    private authService: AuthService,
    private wsService: BinanceWebSocketService,
    private priceService: BinancePriceService,
    private balanceService: BinanceBalanceService,
    private orderService: BinanceOrderService,
    private klineService: BinanceKlineService,
  ) {}

  distributeBalance(balance: number, positions: PositionRisk[]) {
    let initialMarginSum = 0;
    let unrealizedProfitSum = 0;

    positions.forEach((p) => {
      initialMarginSum += parseFloatSafe(p.initialMargin);
      unrealizedProfitSum += parseFloatSafe(p.unRealizedProfit);
    });

    let freeBalance = balance - initialMarginSum;
    if (freeBalance < 0) freeBalance = 0;

    const usableBalance = freeBalance * (1 - RESERVE_FACTOR);
    const freeBalanceNewPosition = usableBalance * NEW_POSITION_RATIO;
    const freeBalanceOldPosition = usableBalance * OLD_POSITION_RATIO;

    const freeBalanceAfterClose = freeBalanceOldPosition + initialMarginSum + unrealizedProfitSum;

    return {
      freeBalanceNewPosition,
      freeBalanceOldPosition,
      freeBalanceAfterClose,
    };
  }

  calculatePositionSize(
    balance: { freeBalanceNewPosition: number },
    positions: PositionRisk[],
    symbols: string[],
  ): number {
    const positionCount = positions.length;
    const symbolCount = symbols.length || 1;

    let remainingSlots = symbolCount - positionCount;
    if (remainingSlots < 1) remainingSlots = 1;

    const initialPositionSize = INITIAL_POSITION_SIZE_USDT;
    const minPositionSize = balance.freeBalanceNewPosition / symbolCount;

    const estimatedPositionSize =
      balance.freeBalanceNewPosition / remainingSlots / POSITION_SAFETY_FACTOR;

    let positionSize = Math.max(initialPositionSize, minPositionSize, estimatedPositionSize);

    if (positionSize > balance.freeBalanceNewPosition) {
      positionSize = balance.freeBalanceNewPosition;
    }

    return Math.round(positionSize * 10) / 10;
  }

  ngOnInit() {
    this.isLoadingTracks = true;

    this.authService.isAuthReady$
      .pipe(
        switchMap((isActive) => {
          if (!isActive || !this.authService.getToken()) {
            return of({
              tracks: [] as Track[],
              positions: {} as { [key: string]: PositionRisk },
              prices: [] as Price[],
              balance: {} as Balance,
              lastEntries: [] as LastEntry[],
              orders: [] as Order[],
            });
          }

          const now = DateTime.local().minus({ hours: 3 });
          const from = now.set({ minute: 0, second: 0 }).toFormat('yyyy-MM-dd HH:mm:ss');
          const to = now.set({ minute: 59, second: 59 }).toFormat('yyyy-MM-dd HH:mm:ss');

          return forkJoin({
            tracks: this.tracksService.getTracks({ from, to, symbol: '', full: true }),
            positions: this.priceService.getPositions(),
            prices: this.priceService.getPrices(),
            balance: this.balanceService.getBalance(),
            lastEntries: this.tracksService.getLastEntries(),
            orders: this.orderService.getOpenOrders(),
          });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ({ tracks, positions, prices, balance, lastEntries, orders }) => {
          const uniqueTracks = Array.from(
            new Map(tracks.map((item) => [item.symbol, item])).values(),
          );
          const positionTracks = Object.values(positions).map((item) => {
            const track = uniqueTracks.find((track) => track.symbol === item.symbol);
            return { ...item, ...track, isOrder: true };
          });
          const restTracks = uniqueTracks
            .filter((item) => {
              return (
                (!positions[item.symbol] && (item.highPrice !== 0 || item.lowPrice !== 0)) ||
                item.symbol === BTCUSDT
              );
            })
            .sort((a, b) => a.symbol.localeCompare(b.symbol));
          // @ts-ignore
          const positions2 = positionTracks.map((item) => this.getPositionPercentageDiff(item));

          // @ts-ignore
          this.tracks = [...positionTracks, ...restTracks].map((item) => {
            const el = lastEntries.find((le) => le.symbol === item.symbol);
            const order = orders.find((le) => le.symbol === item.symbol);

            if (el && el.highPrices && el.highPrices.length) {
              return {
                ...item,
                middlePrice: Math.max(...el.highPrices),
                stopPrice: +(order?.stopPrice ?? 0),
              };
            }
            if (el && el.lowPrices && el.lowPrices.length) {
              return {
                ...item,
                middlePrice: Math.min(...el.lowPrices),
                stopPrice: +(order?.stopPrice ?? 0),
              };
            }
            return { ...item, stopPrice: +(order?.stopPrice ?? 0) };
          });

          prices.forEach((price) => {
            this.prices[price.symbol] = price.price;
          });

          this.countGoodPositions = positions2.filter((item) => item > 0).length;
          this.countBadPositions = positions2.filter((item) => item < 0).length;
          this.countPositions = positionTracks.length;
          this.countLongPositions = positionTracks.filter((item) => +item.positionAmt > 0).length;
          this.countShortPositions = positionTracks.filter((item) => +item.positionAmt < 0).length;
          this.countReadyTracks = restTracks.length;

          this.balance.set(balance);
          this.positions.set(positionTracks);

          this.isLoadingTracks = false;
        },
        error: (err) => {
          this.isLoadingTracks = false;
          console.error(err);
        },
      });

    this.wsService
      .connect()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        data.forEach((ticker: any) => {
          this.prices[ticker.s] = parseFloat(ticker.c);
        });

        const positions = this.tracks
          .filter((track) => track.isOrder)
          .map((item) => this.getPositionPercentageDiff(item));

        this.countGoodPositions = positions.filter((item) => item > 0).length;
        this.countBadPositions = positions.filter((item) => item < 0).length;

        const positions2 = this.tracks
          .filter((track) => {
            return track.isOrder;
          })
          .sort((a, b) => {
            const aa = this.getPositionPercentageDiff(a);
            const bb = this.getPositionPercentageDiff(b);
            return bb - aa;
          });
        const rest = this.tracks.filter((track) => {
          return !track.isOrder;
        });

        const tracks = [...positions2, ...rest];
        const btc = tracks.find((track) => track.symbol === BTCUSDT);
        if (btc) {
          this.tracks = [btc, ...tracks.filter((track) => track.symbol !== BTCUSDT)];
        } else {
          this.tracks = tracks;
        }
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
    return ((value - base) / base) * 100;
  }

  isLong(track: Track): boolean {
    return +(track.positionAmt || 0) > 0;
  }

  getPositionPercentageDiff(track: Track): number {
    if (this.isLong(track)) {
      return this.getPercentageDiff(this.prices[track.symbol], +(track.entryPrice || 0));
    }
    if (!this.isLong(track)) {
      return this.getPercentageDiff(+(track.entryPrice || 0), this.prices[track.symbol]);
    }
    return 0;
  }

  getFormattedColorPositionPercentageDiff(track: Track) {
    if (this.prices[track.symbol]) {
      return this.getPositionPercentageDiff(track) > 0 ? 'green' : 'red';
    }
    return '';
  }

  getFormattedPositionPercentageDiff(track: Track) {
    if (this.prices[track.symbol]) {
      return this.getPositionPercentageDiff(track).toFixed(2) + '%';
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

function parseFloatSafe(value: string): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}
