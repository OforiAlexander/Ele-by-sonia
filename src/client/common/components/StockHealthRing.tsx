import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Stack, Text } from '@mantine/core';
import { StockHealthData } from '../hooks/useStockHealth';
import { t } from '../translations';
import { KEYS } from '../keys';

const CIRC = 314.16;

interface Props {
  stockHealth: StockHealthData;
  active:      boolean;
}

const StockHealthRing: React.FC<Props> = ({ stockHealth, active }) => {
  const { healthy, lowStock, outOfStock, total } = stockHealth;
  const ringHRef = useRef<SVGCircleElement>(null);
  const ringORef = useRef<SVGCircleElement>(null);

  const safeTotal   = total || 1;
  const healthyArc  = ((healthy    / safeTotal) * CIRC).toFixed(1);
  const outArc      = ((outOfStock / safeTotal) * CIRC).toFixed(1);
  const healthyPct  = total > 0 ? ((healthy    / total) * 100).toFixed(1) : '0.0';
  const lowPct      = total > 0 ? ((lowStock   / total) * 100).toFixed(1) : '0.0';
  const outPct      = total > 0 ? ((outOfStock / total) * 100).toFixed(1) : '0.0';

  useLayoutEffect(() => {
    ringHRef.current?.setAttribute('stroke-dasharray', '0 1000');
    ringORef.current?.setAttribute('stroke-dasharray', '0 1000');
    ringORef.current?.setAttribute('stroke-dashoffset', `-${healthyArc}`);
  }, []);

  useEffect(() => {
    if (!active) return;
    if (ringHRef.current) {
      ringHRef.current.style.transition = 'stroke-dasharray 1.1s cubic-bezier(.4,0,.2,1) .45s';
      ringHRef.current.setAttribute('stroke-dasharray', `${healthyArc} ${(CIRC - Number(healthyArc)).toFixed(1)}`);
    }
    if (ringORef.current) {
      ringORef.current.style.transition = 'stroke-dasharray 1.1s cubic-bezier(.4,0,.2,1) .75s';
      ringORef.current.setAttribute('stroke-dasharray', `${outArc} ${(CIRC - Number(outArc)).toFixed(1)}`);
    }
  }, [active]);

  const legend = [
    { label: t(KEYS.dashboard.stockHealth.healthy),   color: '#0E7A52', pct: `${healthyPct}%` },
    { label: t(KEYS.dashboard.stockHealth.lowStock),  color: '#E3A92B', pct: `${lowPct}%`     },
    { label: t(KEYS.dashboard.stockHealth.outOfStock),color: '#D5564B', pct: `${outPct}%`     },
  ];

  return (
    <div className="card">
      <Text fw={600} c="#11231B" fz="sm" mb={18}>{t(KEYS.dashboard.stockHealth.title)}</Text>
      <div className="stock-health-inner">
        <svg className="ring-svg" viewBox="0 0 120 120" width="124" height="124">
          <circle cx="60" cy="60" r="50" fill="none" stroke="#F0F3F1" strokeWidth="16" />
          <circle ref={ringHRef} cx="60" cy="60" r="50" fill="none" stroke="#0E7A52" strokeWidth="16" strokeLinecap="round" strokeDashoffset={0} />
          <circle ref={ringORef} cx="60" cy="60" r="50" fill="none" stroke="#D5564B" strokeWidth="16" />
        </svg>
        <Stack gap={13}>
          {legend.map(({ label, color, pct }) => (
            <div key={label} className="stock-legend-row">
              <span className="stock-legend-dot" style={{ background: color }} />
              <Text fz="sm" c="#3A4A42">{label}</Text>
              <Text fz="sm" fw={600} c="#11231B" ml="auto">{pct}</Text>
            </div>
          ))}
        </Stack>
      </div>
    </div>
  );
};

export default StockHealthRing;
