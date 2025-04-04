import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Track } from '../../entities/track';

interface TrackResponse {
  symbol: string;
  high_price: number;
  low_price: number;
  causes: string[];
  created_at: string;
  is_order: boolean;
  high_created_at: string;
  low_created_at: string;
  high_prices: number[];
  low_prices: number[];
  take_profit_high_prices: number[];
  take_profit_low_prices: number[];
}

interface GetTracksParams {
  from: string;
  to: string;
  symbol: string;
  full: boolean;
}

@Injectable()
export class TracksServices {
  private apiUrl = 'https://api.crypto-knight.site';

  constructor(private http: HttpClient) {}

  getTracks(queryParams: GetTracksParams): Observable<Track[]> {
    let params = new HttpParams();
    for (const key in queryParams) {
      if (queryParams.hasOwnProperty(key)) {
        // @ts-ignore
        params = params.set(key, queryParams[key]);
      }
    }

    return this.http.get<TrackResponse[]>(this.apiUrl + '/tracks', { params }).pipe(
      map((tracks) => {
        return tracks.map((track) => ({
          symbol: track.symbol,
          highPrice: track.high_price,
          lowPrice: track.low_price,
          createdAt: track.created_at,
          causes: track.causes,
          isOrder: track.is_order,
          highCreatedAt: track.high_created_at,
          lowCreatedAt: track.low_created_at,
          highPrices: track.high_prices,
          lowPrices: track.low_prices,
          takeProfitHighPrices: track.take_profit_high_prices,
          takeProfitLowPrices: track.take_profit_low_prices,
        }));
      }),
    );
  }
}
