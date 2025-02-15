import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

interface Tokens {
  access_token: string;
  refresh_token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiSSOUrl = 'https://ssoauth.online';
  private apiUrl = 'https://api.crypto-knight.online';
  isActive = false;
  private authReadySubject = new BehaviorSubject<boolean>(false);
  isAuthReady$ = this.authReadySubject.asObservable();

  constructor(private httpClient: HttpClient) {}

  markAuthReady() {
    this.isActive = true;
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
    return this.httpClient.get(this.apiUrl + '/validate?token=' + token);
  }

  refreshToken(token: string): Observable<Tokens> {
    return this.httpClient.post<Tokens>(this.apiSSOUrl + '/refresh', {
      token,
    });
  }

  exchangeCode(code: string): Observable<Tokens> {
    return this.httpClient.post<Tokens>(this.apiSSOUrl + '/exchange', {
      code,
    });
  }
}
