import { Component, OnDestroy, OnInit, } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
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
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import { CommonModule } from '@angular/common';
import {MatInputModule} from '@angular/material/input';
import {MatExpansionModule} from '@angular/material/expansion';

import {
  CommonService,
  TracksServices,
  BinancePriceService,
  AuthService,
} from '../../services';
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
    JsonPipe,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSelectModule,
    MatIconModule,
    MatCheckboxModule,
    MatAutocompleteModule,
    CommonModule,
    MatInputModule,
    MatExpansionModule
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
  tracks: Track[] = [];
  activeTracks: Track[] = [];
  orderTracks: Track[] = [];
  range = new FormGroup({
    from: new FormControl<Date | null>(new Date()),
    to: new FormControl<Date | null>(new Date()),
  });
  isLoadingTracks: boolean = false;
  prices: { [key: string]: number } = {};
  filteredSymbols: Observable<string[]> | undefined;

  constructor(
    private tracksService: TracksServices,
    private binancePriceService: BinancePriceService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    if (this.authService.isActive) {
        this.getTracks();
    }
  }

  ngOnDestroy() {
    this.tracksSubscription.unsubscribe();
  }

  getTracks() {
    this.isLoadingTracks = true;

    const from = DateTime.fromJSDate(this.range.value?.from ?? new Date())
      .startOf('day')
      .minus({ hours: 3 })
      .toFormat('yyyy-MM-dd HH:mm:ss');
    const to = DateTime.fromJSDate(this.range.value?.to ?? new Date())
      .endOf('day')
      .minus({ hours: 3 })
      .toFormat('yyyy-MM-dd HH:mm:ss');
    const symbol = '';
    const full = true;

    this.tracksSubscription = this.tracksService
      .getTracks({
        from,
        to,
        symbol,
        full,
      })
      .subscribe({
        next: (res) => {
          this.tracks = res;
          this.activeTracks = res.map((item) => {
            const date = DateTime.fromISO(item.createdAt, { zone: 'utc' });
            const dateInZone = date.setZone('UTC+3');
            const createdAt = dateInZone.toFormat('yyyy-MM-dd HH:mm');

            const dateHighCreatedAt = DateTime.fromISO(item.highCreatedAt, { zone: 'utc' });
            const dateHighCreatedAtInZone = dateHighCreatedAt.setZone('UTC+3');
            const highCreatedAt = dateHighCreatedAtInZone.toFormat('yyyy-MM-dd HH:mm');

            const dateLowCreatedAt = DateTime.fromISO(item.lowCreatedAt, { zone: 'utc' });
            const dateLowCreatedAtInZone = dateLowCreatedAt.setZone('UTC+3');
            const lowCreatedAt = dateLowCreatedAtInZone.toFormat('yyyy-MM-dd HH:mm');

            const [lowStopPrice, highStopPrice] = this.getStopLossPrices(
              item.lowPrice,
              item.highPrice
            );

            const hour = new Date(createdAt).getHours();
            const bgColor = hour % 2 === 0 ? '#e0e0e0' : '#c0d6e4';

            return {
              ...item,
              createdAt,
              highCreatedAt,
              lowCreatedAt,
              lowStopPrice: +lowStopPrice.toFixed(5),
              highStopPrice: +highStopPrice.toFixed(5),
              bgColor
            };
          });
          this.orderTracks = this.activeTracks.filter((item) => item.isOrder)

          this.isLoadingTracks = false;
        },
        error: (err) => {
          this.isLoadingTracks = false;
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
