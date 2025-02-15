import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Subscription } from 'rxjs';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CommonService } from '../../services';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [MatSlideToggleModule, FormsModule, ReactiveFormsModule, MatProgressSpinnerModule],
  providers: [CommonService],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit, OnDestroy {
  private statusSubscription: Subscription = new Subscription();
  active: boolean = false;
  isLoadingStatus: boolean = false;

  constructor(private commonService: CommonService) {}

  ngOnInit() {
    this.getStatus();
  }

  ngOnDestroy() {
    this.statusSubscription.unsubscribe();
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

  handleToggleStatus() {
    this.toggleStatus();
  }
}
