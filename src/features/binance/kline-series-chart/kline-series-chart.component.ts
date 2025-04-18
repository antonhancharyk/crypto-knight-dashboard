import { Component, ElementRef, OnInit, ViewChild, Input } from '@angular/core';
import { createChart, CandlestickSeries } from 'lightweight-charts';

import { Kline } from '../../../entities/kline';
import { Track } from '../../../entities/track';

@Component({
  selector: 'kline-series-chart',
  standalone: true,
  templateUrl: './kline-series-chart.component.html',
})
export class KlineSeriesChartComponent implements OnInit {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;
  @Input() klines!: Kline[];
  @Input() current!: number;
  @Input() track!: Track;

  constructor() {}

  ngOnInit(): void {
    const chart = createChart(this.chartContainer.nativeElement, {
      width: 600,
      height: 300,
    });

    chart.applyOptions({
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        tickMarkFormatter: (time: any) => {
          const date = new Date(time * 1000);
          return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1)
            .toString()
            .padStart(2, '0')}`;
        },
      },
    });
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => price.toFixed(8),
      },
    });

    // @ts-ignore
    candlestickSeries.setData(this.klines);

    this.current &&
      candlestickSeries.createPriceLine({
        price: +this.current,
        color: 'blue',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
      });
    this.track.highPrice &&
      candlestickSeries.createPriceLine({
        price: +this.track.highPrice,
        color: 'green',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
      });
    this.track.lowPrice &&
      candlestickSeries.createPriceLine({
        price: +this.track.lowPrice,
        color: 'red',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
      });
  }
}
