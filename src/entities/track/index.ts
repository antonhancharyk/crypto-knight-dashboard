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
  highCreatedAt: string;
  lowCreatedAt: string;
  causes: string[];
  direction?: 'green' | 'red';
  lowStopPrice?: number;
  highStopPrice?: number;
  isOrder: boolean
  resistancePrice1: number;
  supportPrice1: number;
  resistancePrice2: number;
  supportPrice2: number;
  resistancePrice3: number;
  supportPrice3: number;       
}
