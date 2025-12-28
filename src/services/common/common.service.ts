import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_URI } from '../../constants';

@Injectable()
export class CommonService {
  constructor(private http: HttpClient) {}

  getStatus(): Observable<{ enabled: boolean }> {
    return this.http.get<{ enabled: boolean }>(API_URI + '/common/status');
  }

  switchOn(): Observable<Object> {
    return this.http.get(API_URI + '/common/on');
  }

  switchOff(): Observable<Object> {
    return this.http.get(API_URI + '/common/off');
  }
}
