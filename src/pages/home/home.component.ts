import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
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

import { CommonService, TracksServices } from '../../services';
import { Track } from '../../entities/track';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    MatSlideToggleModule,
    MatCardModule,
    MatFormFieldModule,
    MatDatepickerModule,
    FormsModule,
    ReactiveFormsModule,
    JsonPipe,
    MatButtonModule,
  ],
  providers: [CommonService, TracksServices, provideNativeDateAdapter()],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  private statusSubscription: Subscription = new Subscription();
  private tracksSubscription: Subscription = new Subscription();
  active: boolean = false;
  tracks: Track[] = [];
  activeTracks: Track[] = [];
  inactiveTracks: Track[] = [];
  range = new FormGroup({
    from: new FormControl<Date | null>(new Date()),
    to: new FormControl<Date | null>(new Date()),
  });
  isLoadingStatus: boolean = false;
  isLoadingTracks: boolean = false;

  constructor(
    private commonService: CommonService,
    private tracksService: TracksServices
  ) {}

  ngOnInit() {
    this.getStatus();
    this.getTracks();
  }

  ngOnDestroy() {
    this.statusSubscription.unsubscribe();
    this.tracksSubscription.unsubscribe();
  }

  getStatus() {
    this.isLoadingStatus = true;

    this.statusSubscription = this.commonService.getStatus().subscribe({
      next: (status) => {
        this.active = status.enabled;

        this.isLoadingStatus = false;
      },
      error: (err) => {
        this.isLoadingStatus = false;
        console.error(err);
      },
    });
  }

  toggleStatus() {
    this.isLoadingStatus = true;

    this.active = !this.active;

    if (this.active) {
      this.commonService.switchOn().subscribe({
        next: () => {
          this.isLoadingStatus = false;
        },
        error: (err) => {
          this.isLoadingStatus = false;
          console.error(err);
        },
      });
    } else {
      this.commonService.switchOff().subscribe({
        next: () => {
          this.isLoadingStatus = false;
        },
        error: (err) => {
          this.isLoadingStatus = false;
          console.error(err);
        },
      });
    }
  }

  getTracks() {
    this.isLoadingTracks = true;

    this.tracksSubscription = this.tracksService
      .getTracks({
        from: DateTime.fromJSDate(this.range.value?.from ?? new Date())
          .startOf('day')
          .toFormat('yyyy-MM-dd HH:mm:ss'),
        to: DateTime.fromJSDate(this.range.value?.to ?? new Date())
          .endOf('day')
          .toFormat('yyyy-MM-dd HH:mm:ss'),
      })
      .subscribe({
        next: (res) => {
          this.tracks = res;
          this.activeTracks = res
            .filter((item) => {
              return item.highPrice > 0 && item.lowPrice > 0;
            })
            .map((item) => {
              const date = DateTime.fromISO(item.createdAt, { zone: 'utc' });
              const dateInZone = date.setZone('UTC+3');
              const createdAt = dateInZone.toFormat('yyyy-MM-dd HH:mm');

              return { ...item, createdAt };
            });
          this.inactiveTracks = res
            .filter((item) => {
              return item.highPrice === 0 && item.lowPrice === 0;
            })
            .map((item) => {
              const date = DateTime.fromISO(item.createdAt, { zone: 'utc' });
              const dateInZone = date.setZone('UTC+3');
              const createdAt = dateInZone.toFormat('yyyy-MM-dd HH:mm');

              return { ...item, createdAt };
            });

          this.isLoadingTracks = false;
        },
        error: (err) => {
          this.isLoadingTracks = false;
          console.error(err);
        },
      });
  }

  handleToggleStatus() {
    this.toggleStatus();
  }

  handleClickGetTracks() {
    this.getTracks();
  }
}
