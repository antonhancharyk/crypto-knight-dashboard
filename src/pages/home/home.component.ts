import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { DateTime } from 'luxon';
import {
  FormGroup,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { JsonPipe } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

import {
  CommonService,
  TracksServices,
  BinancePriceService,
  AuthService,
} from '../../services';
import { Track } from '../../entities/track';
import { Q1, Q3 } from '../../constants';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatDatepickerModule,
    FormsModule,
    ReactiveFormsModule,
    JsonPipe,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDividerModule,
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
  private tracksSubscription: Subscription = new Subscription();
  private pricesSubscription: Subscription = new Subscription();
  tracks: Track[] = [];
  activeTracks: Track[] = [];
  inactiveTracks: Track[] = [];
  range = new FormGroup({
    from: new FormControl<Date | null>(new Date()),
    to: new FormControl<Date | null>(new Date()),
  });
  isLoadingTracks: boolean = false;
  isLoadingPrices: boolean = false;
  prices: { [key: string]: number } = {};

  constructor(
    private tracksService: TracksServices,
    private binancePriceService: BinancePriceService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    if (this.authService.isActive) {
      // this.getTracks();
    }
  }

  ngOnDestroy() {
    this.tracksSubscription.unsubscribe();
    this.pricesSubscription.unsubscribe();
  }

  getTracks() {
    this.isLoadingTracks = true;

    const from = DateTime.fromJSDate(this.range.value?.from ?? new Date())
      .startOf('day')
      .toFormat('yyyy-MM-dd HH:mm:ss');
    const to = DateTime.fromJSDate(this.range.value?.to ?? new Date())
      .endOf('day')
      .toFormat('yyyy-MM-dd HH:mm:ss');

    this.tracksSubscription = this.tracksService
      .getTracks({
        from,
        to,
      })
      .subscribe({
        next: (res) => {
          this.tracks = res;
          this.activeTracks = res
            // .filter((item) => {
            //   return item.highPrice > 0 && item.lowPrice > 0;
            // })
            .map((item) => {
              const date = DateTime.fromISO(item.createdAt, { zone: 'utc' });
              const dateInZone = date.setZone('UTC+3');
              const createdAt = dateInZone.toFormat('yyyy-MM-dd HH:mm');

              const [lowStopPrice, highStopPrice] = this.getStopLossPrices(
                item.lowPrice,
                item.highPrice
              );

              return {
                ...item,
                createdAt,
                lowStopPrice: +lowStopPrice.toFixed(5),
                highStopPrice: +highStopPrice.toFixed(5),
              };
            });
          // this.inactiveTracks = res
          //   .filter((item) => {
          //     return item.highPrice === 0 && item.lowPrice === 0;
          //   })
          //   .map((item) => {
          //     const date = DateTime.fromISO(item.createdAt, { zone: 'utc' });
          //     const dateInZone = date.setZone('UTC+3');
          //     const createdAt = dateInZone.toFormat('yyyy-MM-dd HH:mm');

          //     return { ...item, createdAt };
          //   });

          this.isLoadingTracks = false;

          this.getPrices();
        },
        error: (err) => {
          this.isLoadingTracks = false;
          console.error(err);
        },
      });
  }

  getPrices() {
    this.isLoadingPrices = true;

    this.pricesSubscription = this.binancePriceService.getPrices().subscribe({
      next: (prices) => {
        prices.forEach((price) => {
          this.prices[price.symbol] = price.price;

          const track = this.activeTracks.find((item) => {
            return item.symbol === price.symbol;
          });
          if (track) {
            const f = (track.highPrice - track.lowPrice) / 100;
            const q1 = track.lowPrice + f * Q1;
            const q3 = track.lowPrice + f * Q3;
            if (price.price <= q1) {
              track.direction = 'red';
            }
            if (price.price >= q3) {
              track.direction = 'green';
            }
          }
        });

        this.isLoadingPrices = false;
      },
      error: (err) => {
        this.isLoadingPrices = false;
        console.error(err);
      },
    });
  }

  handleClickGetTracks() {
    this.getTracks();
  }

  private getStopLossPrices(lowPrice: number, highPrice: number) {
    return [lowPrice + (lowPrice * 3) / 100, highPrice - (highPrice * 3) / 100];
  }
}
