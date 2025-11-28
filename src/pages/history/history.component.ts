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
  private tracksService = inject(TracksServices);
  private binancePriceService = inject(BinancePriceService);
  private klineService = inject(BinanceKlineService);
  private exchangeInfoService = inject(ExchangeInfoService);
  private dialog = inject(MatDialog);

  private destroy$ = new Subject<void>();
  private subs = new Subscription();

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

  range = new FormGroup({
    from: new FormControl<Date | null>(new Date()),
    to: new FormControl<Date | null>(new Date()),
  });

  symbols = signal<string[]>(SYMBOLS.slice().sort());
  symbolControl = new FormControl<string>('');
  fullControl = new FormControl<boolean>(false);
  historyControl = new FormControl<boolean>(true);
  intervalControl = new FormControl<string>('1h');

  filteredSymbols: Observable<string[]> = of([]);

  private klineSub?: Subscription;

  intervals = ['30m', '1h', '4h'];

  constructor() {}

  ngOnInit() {
    const exchSub = this.exchangeInfoService
      .getExchangeInfo()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (info) => this.exchangeInfo.set(info),
        error: (err) => console.error('ExchangeInfo error', err),
      });
    this.subs.add(exchSub);

    this.filteredSymbols = this.symbolControl.valueChanges.pipe(
      startWith(''),
      map((value) => this._filter(value || '')),
    );

    effect(() => {
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

    let params = {
      from,
      to,
      symbol,
      full,
      history,
    };
    if (history) {
      //@ts-ignore
      params = { ...params, interval: this.intervalControl.value };
    }

    const tracksSub = this.tracksService
      .getTracks(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.tracks.set(res || []);

          const transformed = (res || []).map((item) => {
            const date = DateTime.fromISO(item.createdAt, { zone: 'utc' });
            const createdAt = date.toFormat('yyyy-MM-dd HH:mm');

            let [lowStopPrice, highStopPrice] = this.getStopLossPrices(
              item.lowPrice,
              item.highPrice,
            );

            const tickSize = getPriceTick(this.exchangeInfo(), item.symbol);
            lowStopPrice = roundPrice(lowStopPrice, tickSize);
            highStopPrice = roundPrice(highStopPrice, tickSize);

            const highPrice = roundPrice(item.highPrice, tickSize);
            const lowPrice = roundPrice(item.lowPrice, tickSize);

            const highPrices = (item.highPrices || []).map((p) => roundPrice(p, tickSize));
            const lowPrices = (item.lowPrices || []).map((p) => roundPrice(p, tickSize));

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

            const idx = active.findIndex((t) => t.symbol === p.symbol);
            if (idx !== -1) {
              const track = active[idx];
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
              active[idx] = track;
            }
          });

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

  handleClickGetTracks() {
    this.getTracks();
  }

  private getStopLossPrices(lowPrice: number, highPrice: number) {
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

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return (this.symbols() || []).filter((option) => option.toLowerCase().includes(filterValue));
  }
}
