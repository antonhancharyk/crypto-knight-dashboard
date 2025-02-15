export interface Price {
  symbol: string;
  price: number;
}

export interface PositionRisk {
  adl: number;
  askNotional: string;
  bidNotional: string;
  breakEvenPrice: string;
  entryPrice: string;
  initialMargin: string;
  isolatedMargin: string;
  isolatedWallet: string;
  liquidationPrice: string;
  maintMargin: string;
  marginAsset: string;
  markPrice: string;
  notional: string;
  openOrderInitialMargin: string;
  positionAmt: string;
  positionInitialMargin: string;
  positionSide: string;
  symbol: string;
  unRealizedProfit: string;
  updateTime: number;
}
