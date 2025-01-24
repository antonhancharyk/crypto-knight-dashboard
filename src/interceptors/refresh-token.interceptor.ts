import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { AuthService } from '../services/auth/auth.service';
import { REDIRECT_TO_SSO } from '../constants';

interface Tokens {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class RefreshTokenInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          const token = this.authService.getRefreshToken();
          if (!token) {
            // window.location.href = REDIRECT_TO_SSO;

            return new Observable<HttpEvent<any>>();
          }

          return this.authService.refreshToken(token).pipe(
            switchMap((res: Tokens) => {
              this.authService.setToken(res.access_token);
              this.authService.setRefreshToken(res.refresh_token);

              const authReq = req.clone({
                headers: req.headers.set(
                  'Authorization',
                  'Bearer ' + res.access_token
                ),
              });
              return next.handle(authReq);
            }),
            catchError(() => {
              this.authService.setToken('');
              this.authService.setRefreshToken('');

              // window.location.href = REDIRECT_TO_SSO;

              return throwError(error);
            })
          );
        }

        return throwError(error);
      })
    );
  }
}
