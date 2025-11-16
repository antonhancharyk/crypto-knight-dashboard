import { Component, OnDestroy, OnInit, inject, signal, computed, effect } from '@angular/core';
import { Observable, Subscription, startWith, map, of } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { DateTime } from 'luxon';
import { FormGroup, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';

import {
  CommonService,
  TracksServices,
  BinancePriceService,
  BinanceKlineService,
  ExchangeInfoService,
} from '../../services';
import { Track } from '../../entities/track';
import { Q1, SYMBOLS } from '../../constants';
import { KlineSeriesChartComponent } from '../../features/binance/kline-series-chart/kline-series-chart.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { Kline } from '../../entities/kline';
import { getPriceTick, roundPrice } from '../../utils/price/price.utils';
import { ExchangeInfo } from '../../entities/common';

@Component({
  selector: 'app-history',
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
    BinanceKlineService,
    ExchangeInfoService,
  ],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
})
export class HistoryComponent implements OnInit, OnDestroy {
  // services (injected)
  private tracksService = inject(TracksServices);
  private binancePriceService = inject(BinancePriceService);
  private klineService = inject(BinanceKlineService);
  private exchangeInfoService = inject(ExchangeInfoService);
  private dialog = inject(MatDialog);

  // cleanup
  private destroy$ = new Subject<void>();
  private subs = new Subscription();

  // signals
  tracks = signal<Track[]>([]);
  activeTracks = signal<Track[]>([]);
  orderTracks = signal<Track[]>([]);
  prices = signal<Record<string, number>>({});
  isLoadingTracks = signal(false);
  isLoadingPrices = signal(false);
  isLoadingKlines = signal(false);
  exchangeInfo = signal<ExchangeInfo>({
    timezone: '',
    serverTime: 0,
    symbols: [],
  });

  // reactive form controls (keep them as FormControl for template bindings)
  range = new FormGroup({
    from: new FormControl<Date | null>(new Date()),
    to: new FormControl<Date | null>(new Date()),
  });

  symbols = signal<string[]>(SYMBOLS.slice().sort());
  symbolControl = new FormControl<string>('');
  fullControl = new FormControl<boolean>(false);
  historyControl = new FormControl<boolean>(true);

  // filtered symbols for autocomplete as Observable (valueChanges)
  filteredSymbols: Observable<string[]> = of([]);

  // kline subscription holder
  private klineSub?: Subscription;

  constructor() {}

  ngOnInit() {
    // exchange info fetch
    const exchSub = this.exchangeInfoService
      .getExchangeInfo()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (info) => this.exchangeInfo.set(info),
        error: (err) => console.error('ExchangeInfo error', err),
      });
    this.subs.add(exchSub);

    // prepare filteredSymbols observable for autocomplete
    this.filteredSymbols = this.symbolControl.valueChanges.pipe(
      startWith(''),
      map((value) => this._filter(value || '')),
    );

    // effect: when exchangeInfo updates, update symbols tick rounding if needed
    effect(() => {
      // ensures computed subscription - when exchangeInfo changes, we can recalc activeTracks rounding when fetching next time
      const _ = this.exchangeInfo();
      void _;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.subs.unsubscribe();
    this.klineSub?.unsubscribe();
  }

  // -------------------- API calls (use signals) --------------------

  getTracks() {
    this.isLoadingTracks.set(true);

    const from = DateTime.fromJSDate(this.range.value?.from ?? new Date())
      .startOf('day')
      .minus({ hours: 3 })
      .toFormat('yyyy-MM-dd HH:mm:ss');
    const to = DateTime.fromJSDate(this.range.value?.to ?? new Date())
      .endOf('day')
      .minus({ hours: 3 })
      .toFormat('yyyy-MM-dd HH:mm:ss');

    const symbol = this.symbolControl.value ?? '';
    const full = this.fullControl.value ?? true;
    const history = this.historyControl.value ?? true;

    const tracksSub = this.tracksService
      .getTracks({
        from,
        to,
        symbol,
        full,
        history,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          // set raw tracks
          this.tracks.set(res || []);

          // transform tracks to display-ready activeTracks
          const transformed = (res || []).map((item) => {
            // createdAt in readable format (UTC -> local-like)
            const date = DateTime.fromISO(item.createdAt, { zone: 'utc' });
            const createdAt = date.toFormat('yyyy-MM-dd HH:mm');

            // stop loss candidates: lowStopPrice, highStopPrice
            let [lowStopPrice, highStopPrice] = this.getStopLossPrices(
              item.lowPrice,
              item.highPrice,
            );

            // tick size rounding
            const tickSize = getPriceTick(this.exchangeInfo(), item.symbol);
            lowStopPrice = roundPrice(lowStopPrice, tickSize);
            highStopPrice = roundPrice(highStopPrice, tickSize);

            // round main extremes and arrays
            const highPrice = roundPrice(item.highPrice, tickSize);
            const lowPrice = roundPrice(item.lowPrice, tickSize);

            const highPrices = (item.highPrices || []).map((p) => roundPrice(p, tickSize));
            const lowPrices = (item.lowPrices || []).map((p) => roundPrice(p, tickSize));

            // alternating background color for cards (simple heuristic)
            const hour = new Date(createdAt).getHours();
            const bgColor = hour % 2 === 0 ? '#e0e0e0' : '#c0d6e4';

            return {
              ...item,
              createdAt,
              lowStopPrice,
              highStopPrice,
              highPrice,
              lowPrice,
              highPrices,
              lowPrices,
              bgColor,
            } as Track & {
              createdAt?: string;
              lowStopPrice?: number;
              highStopPrice?: number;
              highPrices?: number[];
              lowPrices?: number[];
              bgColor?: string;
            };
          });

          this.activeTracks.set(transformed);
          this.orderTracks.set(transformed.filter((t) => t.isOrder));
          this.isLoadingTracks.set(false);

          // after we get tracks, fetch current prices to decorate them with direction
          this.getPrices();
        },
        error: (err) => {
          console.error('getTracks error', err);
          this.isLoadingTracks.set(false);
        },
      });

    this.subs.add(tracksSub);
  }

  getPrices() {
    this.isLoadingPrices.set(true);

    const pricesSub = this.binancePriceService
      .getPrices()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (pricesArr) => {
          const current = { ...(this.prices() || {}) };
          const active = this.activeTracks().slice();

          pricesArr.forEach((p) => {
            current[p.symbol] = p.price;

            // find track and set direction if needed
            const idx = active.findIndex((t) => t.symbol === p.symbol);
            if (idx !== -1) {
              const track = active[idx];
              // track.highPrice and lowPrice may be undefined or rounded earlier
              if (track.highPrice && track.highPrice > 0) {
                const q3 = track.highPrice - (track.highPrice * Q1) / 100;
                if (p.price >= q3) {
                  track.direction = 'green';
                }
              }
              if (track.lowPrice && track.lowPrice > 0) {
                const q1 = track.lowPrice + (track.lowPrice * Q1) / 100;
                if (p.price <= q1) {
                  track.direction = 'red';
                }
              }
              // write back to active array
              active[idx] = track;
            }
          });

          // update signals
          this.prices.set(current);
          this.activeTracks.set(active);
          this.isLoadingPrices.set(false);
        },
        error: (err) => {
          console.error('getPrices error', err);
          this.isLoadingPrices.set(false);
        },
      });

    this.subs.add(pricesSub);
  }

  // -------------------- UI actions & helpers --------------------

  handleClickGetTracks() {
    this.getTracks();
  }

  private getStopLossPrices(lowPrice: number, highPrice: number) {
    // original behavior: low + 3%, high - 3%
    return [lowPrice + (lowPrice * 3) / 100, highPrice - (highPrice * 3) / 100];
  }

  clearSymbol() {
    this.symbolControl.reset();
  }

  transformToUppercase(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.toUpperCase();
    this.symbolControl.setValue(input.value);
  }

  getColorLevel(pricesArr: number[], price: number, idx: number): string {
    if (!pricesArr || pricesArr.length === 0) return '';
    if (idx > 2) return '';

    const top = pricesArr.slice(0, 3);
    const max = Math.max(...top);
    const min = Math.min(...top);
    if (max === price) return 'green';
    if (min === price) return 'red';
    return '';
  }

  openKlineChart(item: Track) {
    // unsubscribe previous
    this.klineSub?.unsubscribe();
    this.isLoadingKlines.set(true);

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
                current: this.prices()[item.symbol],
              },
            },
          });
        },
        error: (err) => {
          console.error('kline error', err);
          this.isLoadingKlines.set(false);
        },
        complete: () => {
          this.isLoadingKlines.set(false);
        },
      });

    if (this.klineSub) this.subs.add(this.klineSub);
  }

  // autocomplete filter (used by filteredSymbols)
  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return (this.symbols() || []).filter((option) => option.toLowerCase().includes(filterValue));
  }
}
