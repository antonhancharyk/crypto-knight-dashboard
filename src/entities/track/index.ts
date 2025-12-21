export interface Track {
  symbol: string;
  highPrice: number;
  lowPrice: number;
  middlePriceHigh: number;
  middlePriceLow: number;
  direction?: 'green' | 'red';
  isPosition: boolean;
  highPrices: number[];
  lowPrices: number[];
  bgColor?: string;
  positionAmt?: string;
  entryPrice?: string;
  middlePrice?: number;
  stopPrice?: number;
  unRealizedProfit?: string;
  initialMargin?: string;
  createdAt: string;
}

export interface LastEntry {
  symbol: string;
  highPrice: number;
  lowPrice: number;
  highPrices: number[];
  lowPrices: number[];
}
