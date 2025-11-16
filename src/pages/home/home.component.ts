import { Component, OnDestroy, OnInit, inject, signal, computed, effect } from '@angular/core';
import { Subject, forkJoin, Subscription, of } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
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
  private tracksService = inject(TracksServices);
  private authService = inject(AuthService);
  private wsService = inject(BinanceWebSocketService);
  private priceService = inject(BinancePriceService);
  private balanceService = inject(BinanceBalanceService);
  private orderService = inject(BinanceOrderService);
  private klineService = inject(BinanceKlineService);
  private dialog = inject(MatDialog);

  private destroy$ = new Subject<void>();
  private subs = new Subscription();

  tracks = signal<Track[]>([]);
  prices = signal<Record<string, number>>({});
  isLoadingKlines = signal(false);
  isLoadingTracks = signal(false);
  balance = signal<Balance | null>(null);
  positions = signal<PositionRisk[]>([]);

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

  countPositions = computed(() => {
    return this.positions().length;
  });

  countLongPositions = computed(() => {
    return this.positions().filter((p) => +p.positionAmt > 0).length;
  });

  countShortPositions = computed(() => {
    return this.positions().filter((p) => +p.positionAmt < 0).length;
  });

  countGoodPositions = computed(() => {
    const diffs = this.tracks()
      .filter((t) => t.isOrder)
      .map((t) => this.getPositionPercentageDiff(t));
    return diffs.filter((d) => d > 0).length;
  });

  countBadPositions = computed(() => {
    const diffs = this.tracks()
      .filter((t) => t.isOrder)
      .map((t) => this.getPositionPercentageDiff(t));
    return diffs.filter((d) => d < 0).length;
  });

  private wsSub?: Subscription;
  private klineSub?: Subscription;

  constructor() {}

  ngOnInit() {
    this.isLoadingTracks.set(true);

    const initSub = this.authService.isAuthReady$
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
          const uniqueTracks = Array.from(new Map(tracks.map((t) => [t.symbol, t])).values());

          const positionTracks = Object.values(positions).map((item) => {
            const track = uniqueTracks.find((t) => t.symbol === item.symbol);
            return { ...item, ...track, isOrder: true } as Track & PositionRisk;
          });

          const restTracks = uniqueTracks
            .filter((item) => {
              return (
                (!positions[item.symbol] && (item.highPrice !== 0 || item.lowPrice !== 0)) ||
                item.symbol === BTCUSDT
              );
            })
            .sort((a, b) => a.symbol.localeCompare(b.symbol));

          const combined = [...positionTracks, ...restTracks].map((item) => {
            const el = lastEntries.find((le) => le.symbol === item.symbol);
            const order = orders.find((o) => o.symbol === item.symbol);
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

          const priceMap: Record<string, number> = {};
          prices.forEach((p) => {
            priceMap[p.symbol] = p.price;
          });

          const btc = combined.find((t) => t.symbol === BTCUSDT);
          const ordering = btc ? [btc, ...combined.filter((t) => t.symbol !== BTCUSDT)] : combined;

          this.tracks.set(ordering);
          this.prices.set(priceMap);

          this.positions.set(positionTracks as unknown as PositionRisk[]);
          this.balance.set(balance);

          this.isLoadingTracks.set(false);
        },
        error: (err) => {
          console.error('Initial load error', err);
          this.isLoadingTracks.set(false);
        },
      });

    this.subs.add(initSub);

    this.wsSub = this.wsService
      .connect()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        const currentPrices = { ...this.prices() };
        data.forEach((ticker: any) => {
          currentPrices[ticker.s] = parseFloatSafe(ticker.c);
        });
        this.prices.set(currentPrices);

        const tracks = this.tracks();
        const positionsOnly = tracks.filter((t) => t.isOrder);
        const sortedPositions = positionsOnly
          .slice()
          .sort((a, b) => this.getPositionPercentageDiff(b) - this.getPositionPercentageDiff(a));
        const rest = tracks.filter((t) => !t.isOrder);
        const btc = [...sortedPositions, ...rest].find((t) => t.symbol === BTCUSDT);
        const ordered = btc
          ? [btc, ...[...sortedPositions, ...rest].filter((t) => t.symbol !== BTCUSDT)]
          : [...sortedPositions, ...rest];
        this.tracks.set(ordered);
      });

    if (this.wsSub) this.subs.add(this.wsSub);

    effect(() => {
      const b = this.balance();
      const p = this.positions();
      void b;
      void p;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.subs.unsubscribe();
    this.wsService.close();
    this.klineSub?.unsubscribe();
  }

  getPrice(symbol: string): number | undefined {
    return this.prices()[symbol];
  }

  isLong(track: Track): boolean {
    return +(track.positionAmt || 0) > 0;
  }

  getPercentageDiff(value: number | undefined, base: number | undefined): number {
    if (value === undefined || value === null || base === undefined || base === null) {
      return 100;
    }
    if (!base) return 100;
    return ((value - base) / base) * 100;
  }

  getPositionPercentageDiff(track: Track): number {
    const price = this.getPrice(track.symbol) ?? 0;
    if (this.isLong(track)) {
      return this.getPercentageDiff(price, +(track.entryPrice || 0));
    } else {
      return this.getPercentageDiff(+(track.entryPrice || 0), price);
    }
  }

  getFormattedColorPositionPercentageDiff(track: Track) {
    const price = this.getPrice(track.symbol);
    if (price) {
      return this.getPositionPercentageDiff(track) > 0 ? 'green' : 'red';
    }
    return '';
  }

  getFormattedPositionPercentageDiff(track: Track) {
    const price = this.getPrice(track.symbol);
    if (price) {
      return this.getPositionPercentageDiff(track).toFixed(2) + '%';
    }
    return '';
  }

  openKlineChart(item: Track) {
    this.klineSub?.unsubscribe();
    this.isLoadingKlines.set(true);

    this.klineSub = this.klineService.getKlines(item.symbol).subscribe({
      next: (klines: Kline[]) => {
        this.dialog.open(ModalComponent, {
          data: {
            component: KlineSeriesChartComponent,
            componentInputs: {
              klines,
              track: item,
              current: this.getPrice(item.symbol),
            },
          },
        });
      },
      error: (err) => {
        console.error('Klines error', err);
        this.isLoadingKlines.set(false);
      },
      complete: () => {
        this.isLoadingKlines.set(false);
      },
    });

    if (this.klineSub) this.subs.add(this.klineSub);
  }

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
}

function parseFloatSafe(value: any): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}
