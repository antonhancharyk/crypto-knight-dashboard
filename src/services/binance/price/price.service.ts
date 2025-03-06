import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Price, PositionRisk } from '../../../entities/price';
import { BINANCE_API_URI, API_URI } from '../../../constants';

@Injectable()
export class BinancePriceService {
  constructor(private http: HttpClient) {}

  getPrices(): Observable<Price[]> {
    return this.http.get<Price[]>(`${BINANCE_API_URI}/fapi/v1/ticker/price`);
  }

  getPositions(): Observable<{ [key: string]: PositionRisk }> {
    return this.http.get<{ [key: string]: PositionRisk }>(`${API_URI}/position`);
  }
}
