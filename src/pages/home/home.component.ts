import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { switchMap, takeUntil, tap } from 'rxjs/operators';
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

import { CommonService, TracksServices, BinancePriceService, AuthService } from '../../services';
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
  private destroy$ = new Subject<void>();
  tracks$: Observable<Track[]> = new Observable();

  range = new FormGroup({
    from: new FormControl<Date | null>(new Date()),
    to: new FormControl<Date | null>(new Date()),
  });

  constructor(
    private tracksService: TracksServices,
    private authService: AuthService
  ) {}

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
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getTracks(): Observable<Track[]> {
    const from = DateTime.fromJSDate(this.range.value?.from ?? new Date())
      .startOf('day')
      .minus({ hours: 3 })
      .toFormat('yyyy-MM-dd HH:mm:ss');
    const to = DateTime.fromJSDate(this.range.value?.to ?? new Date())
      .endOf('day')
      .minus({ hours: 3 })
      .toFormat('yyyy-MM-dd HH:mm:ss');

    return this.tracksService.getTracks({ from, to, symbol: '', full: true }).pipe(
      tap((tracks) => {
        tracks.forEach((item) => {
          const date = DateTime.fromISO(item.createdAt, { zone: 'utc' }).setZone('UTC+3');
          item.createdAt = date.toFormat('yyyy-MM-dd HH:mm');
        });
      })
    );
  }
}
