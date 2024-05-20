import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Track } from '../../entities/track';

interface TrackResponse {
  symbol: string;
  high_price: number;
  low_price: number;
  created_at: string;
}

@Injectable()
export class TracksServices {
  private apiUrl = 'https://api.crypto-knight.online';

  constructor(private http: HttpClient) {}

  getTracks(): Observable<Track[]> {
    return this.http.get<TrackResponse[]>(this.apiUrl + '/tracks').pipe(
      map((tracks) => {
        return tracks.map((track) => ({
          symbol: track.symbol,
          highPrice: track.high_price,
          lowPrice: track.low_price,
          createdAt: track.created_at,
        }));
      })
    );
  }
}
