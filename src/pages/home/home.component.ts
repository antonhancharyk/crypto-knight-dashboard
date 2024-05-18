import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { DateTime } from 'luxon';

import { CommonService, TracksServices } from '../../services';
import { Track } from '../../entities/track';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MatSlideToggleModule, MatCardModule],
  providers: [CommonService, TracksServices],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  active: boolean = false;
  private statusSubscription: Subscription = new Subscription();
  private tracksSubscription: Subscription = new Subscription();
  tracks: Track[] = [];
  activeTracks: Track[] = [];
  inactiveTracks: Track[] = [];

  constructor(
    private commonService: CommonService,
    private tracksService: TracksServices
  ) {}

  ngOnInit() {
    this.statusSubscription = this.commonService.getStatus().subscribe({
      next: (status) => (this.active = status.enabled),
      error: (err) => console.error(err),
    });
    this.tracksSubscription = this.tracksService.getTracks().subscribe({
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
      },
      error: (err) => console.error(err),
    });
  }

  ngOnDestroy() {
    this.statusSubscription.unsubscribe();
    this.tracksSubscription.unsubscribe();
  }

  handleToggleStatus() {
    this.active = !this.active;

    if (this.active) {
      this.commonService.switchOn().subscribe({
        error: (err) => console.error(err),
      });
    } else {
      this.commonService.switchOff().subscribe({
        error: (err) => console.error(err),
      });
    }
  }
}
