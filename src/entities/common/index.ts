export interface Filter {
  filterType: string;
  minPrice?: string;
  maxPrice?: string;
  tickSize?: string;
  minQty?: string;
  maxQty?: string;
  stepSize?: string;
}

export interface SymbolInfo {
  symbol: string;
  pair: string;
  contractType: string;
  baseAsset: string;
  quoteAsset: string;
  marginAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  filters: Filter[];
}

export interface ExchangeInfo {
  timezone: string;
  serverTime: number;
  symbols: SymbolInfo[];
}
