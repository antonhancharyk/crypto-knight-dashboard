export interface Track {
  symbol: string;
  highPrice: number;
  lowPrice: number;
  highPrice1: number;
  lowPrice1: number;
  highPrice2: number;
  lowPrice2: number;
  highPrice3: number;
  lowPrice3: number;
  createdAt: string;
  causes: string[];
  direction?: 'green' | 'red';
  lowStopPrice?: number;
  highStopPrice?: number;
  isOrder: boolean
}
