export interface Order {
  clientOrderId: string;
  cumQty: string;
  cumQuote: string;
  executedQty: string;
  orderId: number;
  avgPrice: string;
  origQty: string;
  price: string;
  reduceOnly: boolean;
  side: string;
  positionSide: string;
  status: string;
  stopPrice: string;
  closePosition: boolean;
  symbol: string;
  timeInForce: string;
  type: string;
  origType: string;
  activatePrice: string;
  priceRate: string;
  updateTime: number;
  workingType: string;
  priceProtect: boolean;
}
