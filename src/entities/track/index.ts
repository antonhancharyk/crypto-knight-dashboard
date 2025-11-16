export interface Track {
  symbol: string;
  highPrice: number;
  lowPrice: number;
  createdAt: string;
  direction?: 'green' | 'red';
  isOrder: boolean;
  highPrices: number[];
  lowPrices: number[];
  bgColor?: string;
  positionAmt?: string;
  entryPrice?: string;
  middlePrice?: number;
  stopPrice?: number;
  unRealizedProfit?: string;
  initialMargin?: string;
}

export interface LastEntry {
  symbol: string;
  highPrice: number;
  lowPrice: number;
  highPrices: number[];
  lowPrices: number[];
}
