import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Group } from '@mantine/core';
import api from '../api';
import { buildChartPath } from '../utils/buildChartPath';
import { t } from '../translations';
import { KEYS } from '../keys';

const PERIOD_MAP = { '7D': 'weekly', '30D': 'monthly', '12M': 'annual' } as const;

interface Props {
  initialChart:  { labels: string[]; values: number[] };
  range:         '7D' | '30D' | '12M';
  onRangeChange: (r: '7D' | '30D' | '12M') => void;
  active:        boolean;
}

const SalesTrendChart: React.FC<Props> = ({ initialChart, range, onRangeChange, active }) => {
  const [chart, setChart] = useState(initialChart);
  const lineRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);
  const chartPath = buildChartPath(chart.values);

  useLayoutEffect(() => {
    const len = lineRef.current?.getTotalLength() ?? 1200;
    lineRef.current?.setAttribute('stroke-dasharray', String(len));
    lineRef.current?.setAttribute('stroke-dashoffset', String(len));
    if (areaRef.current) areaRef.current.style.opacity = '0';
  }, []);

  useEffect(() => {
    if (!active) return;
    const len = lineRef.current?.getTotalLength() ?? 1200;
    if (lineRef.current) {
      lineRef.current.setAttribute('stroke-dasharray', String(len));
      lineRef.current.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)';
      lineRef.current.setAttribute('stroke-dashoffset', '0');
    }
    if (areaRef.current) {
      areaRef.current.style.transition = 'opacity .6s ease .5s';
      areaRef.current.style.opacity = '1';
    }
  }, [active]);

  useEffect(() => {
    const period = PERIOD_MAP[range];
    api.get(`/reports/chart?period=${period}&metric=revenue`).catch(() => null).then((res) => {
      if (res?.data?.data) setChart(res.data.data);
    });
  }, [range]);

  return (
    <div className="card">
      <Group justify="space-between" mb={6}>
        <span className="card-title">{t(KEYS.dashboard.chart.salesTrend)}</span>
        <div className="seg">
          {(['7D', '30D', '12M'] as const).map(r => (
            <div key={r} className={`segbtn${range === r ? ' active' : ''}`} onClick={() => onRangeChange(r)}>{r}</div>
          ))}
        </div>
      </Group>
      <div className="chart-container">
        <svg className="chart-svg" viewBox="0 0 600 220" width="100%" height="210" preserveAspectRatio="none">
          <defs>
            <linearGradient id="vgFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#0E7A52" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#0E7A52" stopOpacity={0} />
            </linearGradient>
          </defs>
          <line x1="0" y1="45"  x2="600" y2="45"  stroke="#EEF1EF" strokeWidth="1" />
          <line x1="0" y1="98"  x2="600" y2="98"  stroke="#EEF1EF" strokeWidth="1" />
          <line x1="0" y1="151" x2="600" y2="151" stroke="#EEF1EF" strokeWidth="1" />
          <line x1="0" y1="200" x2="600" y2="200" stroke="#E4E8E5" strokeWidth="1" />
          <path ref={areaRef} d={chartPath.area} fill="url(#vgFill)" />
          <path
            ref={lineRef}
            d={chartPath.line}
            fill="none"
            stroke="#0E7A52"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <Group justify="space-between" mt={8}>
        {chart.labels.map(l => (
          <span key={l} className="chart-label">{l}</span>
        ))}
      </Group>
    </div>
  );
};

export default SalesTrendChart;
