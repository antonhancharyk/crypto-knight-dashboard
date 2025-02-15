import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

import {SSO_API_URI, API_URI} from '../../constants'

interface Tokens {
  access_token: string;
  refresh_token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private authReadySubject = new BehaviorSubject<boolean>(false);
  isAuthReady$ = this.authReadySubject.asObservable();

  constructor(private httpClient: HttpClient) {}

  markAuthReady() {
    this.authReadySubject.next(true);
  }
  
  getToken() {
    return localStorage.getItem('token') ?? '';
  }

  setToken(token: string) {
    localStorage.setItem('token', token);
  }

  getRefreshToken() {
    return localStorage.getItem('refresh_token') ?? '';
  }

  setRefreshToken(token: string) {
    localStorage.setItem('refresh_token', token);
  }

  validateToken(token: string): Observable<Object> {
    return this.httpClient.get(API_URI + '/validate?token=' + token);
  }

  refreshToken(token: string): Observable<Tokens> {
    return this.httpClient.post<Tokens>(SSO_API_URI + '/refresh', {
      token,
    });
  }

  exchangeCode(code: string): Observable<Tokens> {
    return this.httpClient.post<Tokens>(SSO_API_URI + '/exchange', {
      code,
    });
  }
}
