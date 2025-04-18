import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { Kline } from '../../../entities/kline';
import { API_URI } from '../../../constants';

@Injectable()
export class BinanceKlineService {
  constructor(private http: HttpClient) {}

  getKlines(symbol: string = 'BTCUSDT'): Observable<Kline[]> {
    const url = `${API_URI}/klines?symbol=${symbol}`;

    return this.http.get<any[]>(url).pipe(
      map((data) =>
        data.map((item) => {
          return {
            time: Math.floor(item[0] / 1000),
            open: parseFloat(item[1]),
            high: parseFloat(item[2]),
            low: parseFloat(item[3]),
            close: parseFloat(item[4]),
          };
        }),
      ),
    );
  }
}
