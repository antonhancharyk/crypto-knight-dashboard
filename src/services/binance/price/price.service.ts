import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import * as CryptoJS from 'crypto-js';

import { Price, PositionRisk } from '../../../entities/price';
import { BINANCE_API_URI } from '../../../constants';

@Injectable()
export class BinancePriceService {
  private apiKey = '';
  private secretKey = '';

  constructor(private http: HttpClient) {}

  getPrices(): Observable<Price[]> {
    return this.http.get<Price[]>(`${BINANCE_API_URI}/fapi/v1/ticker/price`);
  }

  getPositionRisk(): Observable<PositionRisk[]> {
    const timestamp = Date.now().toString();
    const params = new HttpParams().set('timestamp', timestamp);
    const signature = CryptoJS.HmacSHA256(params.toString(), this.secretKey).toString(
      CryptoJS.enc.Hex,
    );
    const signedParams = params.set('signature', signature);

    return this.http.get<PositionRisk[]>(`${BINANCE_API_URI}/fapi/v3/positionRisk`, {
      params: signedParams,
      headers: {
        'X-MBX-APIKEY': this.apiKey,
      },
    });
  }
}
