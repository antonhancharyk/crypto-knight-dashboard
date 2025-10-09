import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Order } from '../../../entities/order';
import { API_URI } from '../../../constants';

@Injectable()
export class BinanceOrderService {
  constructor(private http: HttpClient) {}

  getOpenOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${API_URI}/orders`);
  }
}
