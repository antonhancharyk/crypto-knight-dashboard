export interface Track {
  symbol: string;
  highPrice: number;
  lowPrice: number;
  createdAt: string;
  highCreatedAt: string;
  lowCreatedAt: string;
  causes: string[];
  direction?: 'green' | 'red';
  lowStopPrice?: number;
  highStopPrice?: number;
  isOrder: boolean;
  highPrices: number[];
  lowPrices: number[];
  takeProfitHighPrices: number[];
  takeProfitLowPrices: number[];
  bgColor?: string;
  positionAmt?: string;
  entryPrice?: string;
  middlePrice?: number;
}

export interface LastEntry {
  symbol: string;
  highPrice: number;
  lowPrice: number;
  highPrices: number[];
  lowPrices: number[];
}
