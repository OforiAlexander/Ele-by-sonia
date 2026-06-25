export function buildChartPath(values: number[]): { line: string; area: string } {
  const n = values.length;
  if (n === 0) return { line: 'M8 200 L592 200', area: '' };
  const PAD = 8, W = 600, Y_TOP = 14, Y_BOT = 200;
  const maxVal = Math.max(...values, 1);
  const pts = values.map((v, i) => ({
    x: n === 1 ? W / 2 : PAD + (i / (n - 1)) * (W - PAD * 2),
    y: Y_BOT - (v / maxVal) * (Y_BOT - Y_TOP),
  }));
  const coords = pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
  const line = `M${coords.join(' L')}`;
  const area = `${line} L${pts[n - 1].x.toFixed(1)} ${Y_BOT} L${pts[0].x.toFixed(1)} ${Y_BOT} Z`;
  return { line, area };
}
