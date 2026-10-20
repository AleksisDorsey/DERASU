// Gera curvas linear() de mola amortecida: x(t) normalizado para assentar em t=1.
function mola(zeta, n = 48) {
  // escolhe w0 para que o envelope caia a 0,1% em t=1
  const w0 = zeta < 1 ? Math.log(1000) / zeta : 9.2;
  const x = (t) => {
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      return (
        1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t))
      );
    }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  };
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([t, i === n ? 1 : x(t)]);
  }
  // remove pontos quase colineares
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1],
      b = pts[i],
      c = pts[i + 1];
    const interp = a[1] + ((c[1] - a[1]) * (b[0] - a[0])) / (c[0] - a[0]);
    if (Math.abs(interp - b[1]) > 0.002) out.push(b);
  }
  out.push(pts[pts.length - 1]);
  const max = Math.max(...pts.map((p) => p[1]));
  return {
    css: `linear(${out.map(([t, v], i) => (i === 0 || i === out.length - 1 ? v.toFixed(0) : `${+v.toFixed(3)} ${+(t * 100).toFixed(1)}%`)).join(", ")})`,
    max: max.toFixed(3),
  };
}
for (const [nome, z] of [
  ["suave", 1],
  ["viva", 0.72],
  ["firme", 0.86],
]) {
  const m = mola(z);
  console.log(nome, "pico", m.max);
  console.log(m.css);
}
