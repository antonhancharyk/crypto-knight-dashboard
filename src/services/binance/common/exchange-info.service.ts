import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BINANCE_API_URI } from '../../../constants';
import { ExchangeInfo } from '../../../entities/common';

@Injectable({
  providedIn: 'root',
})
export class ExchangeInfoService {
  constructor(private http: HttpClient) {}

  getExchangeInfo(): Observable<ExchangeInfo> {
    return this.http.get<ExchangeInfo>(`${BINANCE_API_URI}/fapi/v1/exchangeInfo`);
  }
}
