import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BinanceWebSocketService implements OnDestroy {
  private socket!: WebSocket;
  private priceSubject = new Subject<any>();

  connect(): Observable<any> {
    const url = 'wss://fstream.binance.com/ws/!ticker@arr';
    
    this.socket = new WebSocket(url);

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.priceSubject.next(data);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return this.priceSubject.asObservable();
  }

  close() {
    if (this.socket) {
      this.socket.close();
    }
  }

  ngOnDestroy() {
    this.close();
  }
}
