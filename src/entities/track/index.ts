export interface Track {
  symbol: string;
  highPrice: number;
  lowPrice: number;
  createdAt: string;
  direction?: 'green' | 'red';
}
