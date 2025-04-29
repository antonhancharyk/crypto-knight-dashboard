import { ExchangeInfo } from '../../entities/common';

export function getPriceTick(exchangeInfo: ExchangeInfo, symbolName: string): string | null {
  const symbol = exchangeInfo.symbols.find((s) => s.symbol === symbolName);
  if (!symbol) {
    return null;
  }

  const priceFilter = symbol.filters.find((f) => f.filterType === 'PRICE_FILTER');
  return priceFilter?.tickSize ?? null;
}

export function roundPrice(price: number, tickSize: string | null): number {
  if (!tickSize) {
    return 0;
  }

  const tick = parseFloat(tickSize);
  if (isNaN(tick) || tick <= 0) {
    return 0;
  }

  const decimalIndex = tickSize.indexOf('.');
  const precision = decimalIndex >= 0 ? tickSize.length - decimalIndex - 1 : 0;
  // const rounded = Math.floor(price / tick) * tick;

  return parseFloat(price.toFixed(precision));
}
