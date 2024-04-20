import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Subscription } from 'rxjs';

import { CommonService } from '../../services';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MatSlideToggleModule],
  providers: [CommonService],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  active: boolean = false;
  private statusSubscription: Subscription = new Subscription();

  constructor(private commonService: CommonService) {}

  ngOnInit() {
    this.statusSubscription = this.commonService.getStatus().subscribe({
      next: (status) => (this.active = status.enabled),
      error: (err) => console.error(err),
    });
  }

  ngOnDestroy() {
    this.statusSubscription.unsubscribe();
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
