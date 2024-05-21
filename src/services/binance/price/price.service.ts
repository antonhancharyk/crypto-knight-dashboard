import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Price } from '../../../entities/price';

interface PriceResponse {
  symbol: string;
  price: number;
}

@Injectable()
export class BinancePriceService {
  private apiUrl = 'https://fapi.binance.com/fapi/v1/ticker/price';

  constructor(private http: HttpClient) {}

  getPrices(): Observable<Price[]> {
    return this.http.get<PriceResponse[]>(this.apiUrl);
  }
}
