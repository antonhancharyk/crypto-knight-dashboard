import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Balance } from '../../../entities/balance';
import { API_URI } from '../../../constants';

@Injectable()
export class BinanceBalanceService {
  constructor(private http: HttpClient) { }

  getBalance(): Observable<Balance> {
    return this.http.get<Balance>(`${API_URI}/balance`);
  }
}
