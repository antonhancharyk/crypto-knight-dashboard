import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Track } from '../../entities/track';

interface TrackResponse {
  symbol: string;
  high_price: number;
  low_price: number;
  high_price_1: number;
  low_price_1: number;
  high_price_2: number;
  low_price_2: number;
  high_price_3: number;
  low_price_3: number;
  causes: string[];
  created_at: string;
  is_order: boolean;
  high_created_at: string;
  low_created_at: string;
}

interface GetTracksParams {
  from: string;
  to: string;
  symbol: string;
  full: boolean;
}

@Injectable()
export class TracksServices {
  private apiUrl = 'https://api.crypto-knight.online';

  constructor(private http: HttpClient) {}

  getTracks(queryParams: GetTracksParams): Observable<Track[]> {
    let params = new HttpParams();
    for (const key in queryParams) {
      if (queryParams.hasOwnProperty(key)) {
        // @ts-ignore
        params = params.set(key, queryParams[key]);
      }
    }

    return this.http
      .get<TrackResponse[]>(this.apiUrl + '/tracks', { params })
      .pipe(
        map((tracks) => {
          return tracks.map((track) => ({
            symbol: track.symbol,
            highPrice: track.high_price,
            lowPrice: track.low_price,
            highPrice1: track.high_price_1,
            lowPrice1: track.low_price_1,
            highPrice2: track.high_price_2,
            lowPrice2: track.low_price_2,
            highPrice3: track.high_price_3,
            lowPrice3: track.low_price_3,
            createdAt: track.created_at,
            causes: track.causes,
            isOrder: track.is_order,
            highCreatedAt: track.high_created_at,
            lowCreatedAt: track.low_created_at,
          }));
        })
      );
  }
}
