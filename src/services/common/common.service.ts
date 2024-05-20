import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class CommonService {
  private apiUrl = 'https://api.crypto-knight.online';

  constructor(private http: HttpClient) {}

  getStatus(): Observable<{ enabled: boolean }> {
    return this.http.get<{ enabled: boolean }>(this.apiUrl + '/common/status');
  }

  switchOn(): Observable<Object> {
    return this.http.get(this.apiUrl + '/common/on');
  }

  switchOff(): Observable<Object> {
    return this.http.get(this.apiUrl + '/common/off');
  }
}
