import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthService } from '../services/auth/auth.service';
import { REDIRECT_TO_SSO } from '../constants';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.url.includes('sso-auth.site/exchange') || req.url.includes('sso-auth.site/refresh')) {
      return next.handle(req);
    }

    const token = this.authService.getToken();
    if (!token) {
      window.location.href = REDIRECT_TO_SSO;

      return new Observable<HttpEvent<any>>();
    }

    const authReq = req.clone({
      headers: req.headers.set('Authorization', 'Bearer ' + token),
    });

    return next.handle(authReq);
  }
}
