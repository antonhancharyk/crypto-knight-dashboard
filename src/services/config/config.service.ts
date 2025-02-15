import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: any;

  constructor(private http: HttpClient) {}

  async loadConfig() {
    this.config = await firstValueFrom(this.http.get('/assets/config.json'));
  }

  get(key: string): string {
    return this.config ? this.config[key] : '';
  }
}
