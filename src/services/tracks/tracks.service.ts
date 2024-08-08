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
}

interface GetTracksParams {
  from: string;
  to: string;
  symbol: string;
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
            createdAt: track.created_at,
            causes: track.causes,
          }));
        })
      );
  }
}
