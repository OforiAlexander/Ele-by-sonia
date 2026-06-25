import React, { useEffect, useState } from 'react';
import { Text } from '@mantine/core';

interface Props {
  target: number;
  fmt:    (v: number) => string;
  active: boolean;
}

const KpiCount: React.FC<Props> = ({ target, fmt, active }) => {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!active) return;
    const dur = 1000, t0 = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      setVal(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target]);

  return (
    <Text fw={700} ff="'Space Grotesk', sans-serif" c="#11231B" lh={1.15} style={{ fontSize: 23 }}>
      {fmt(val)}
    </Text>
  );
};

export default KpiCount;
