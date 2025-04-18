import { Component, Inject, Type, ViewChild, ViewContainerRef, AfterViewInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-modal',
  template: `
    <div mat-dialog-content>
      <ng-container #container></ng-container>
    </div>
  `,
  imports: [CommonModule, MatDialogModule],
})
export class ModalComponent implements AfterViewInit {
  @ViewChild('container', { read: ViewContainerRef }) container!: ViewContainerRef;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      component?: Type<unknown>;
      componentInputs?: Record<string, any>;
    },
  ) {}

  ngAfterViewInit(): void {
    if (this.data.component) {
      const componentRef = this.container.createComponent(this.data.component);

      if (this.data.componentInputs) {
        Object.entries(this.data.componentInputs).forEach(([key, value]) => {
          (componentRef.instance as any)[key] = value;
        });
      }
    }
  }
}
