// Prova da GOTA da barra de abas do celular: a morfose entre abas.
//
// `prova-de-tela.mjs` abre cada rota com `goto` (recarga), e aí a gota já nasce
// no lugar — a prova estática não mostra o deslize. Esta abre a Inbox, toca na
// aba Funis (navegação do próprio app, a barra persiste na casca) e amostra o
// `translate` do `::before` da lista enquanto ele anda, com quadros do meio.
//
// Uso (app de pé, dono em .env.local):
//   node derasu/scripts/prova-gota.mjs <entrega>
// Saída: evidence/derasu-<entrega>/gota_*.jpg e gota-morfose.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const entrega = process.argv[2] ?? "controle";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SAIDA = path.join(RAIZ, "evidence", `derasu-${entrega}`);
fs.mkdirSync(SAIDA, { recursive: true });

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(RAIZ, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);

// JPEG, e não PNG: com o ambiente à mostra o grão fino ocupa a tela toda, e o
// PNG não o comprime — a prova da entrega 2 tinha 62 MB em PNG e 4 MB assim.
const JPEG = { type: "jpeg", quality: 82 };

// GPU pelo mesmo motivo de `prova-de-tela.mjs`.
const browser = await chromium.launch({
  args: ["--enable-gpu", "--use-angle=d3d11", "--ignore-gpu-blocklist"],
});
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  colorScheme: "light",
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(`${BASE}/login`);
await page.getByLabel("Email").fill(env.LOCAL_OWNER_EMAIL);
await page.getByLabel("Senha", { exact: true }).fill(env.LOCAL_OWNER_PASSWORD);
await page.keyboard.press("Enter");
await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 120_000 });
await page.goto(`${BASE}/app/inbox`, { waitUntil: "networkidle", timeout: 180_000 });
await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
await page.waitForTimeout(1200);

const gota = () =>
  page.evaluate(() => {
    const ul = document.querySelector("nav[data-barra-inferior] > ul");
    const s = getComputedStyle(ul, "::before");
    return { translate: s.translate, opacidade: s.opacity, largura: s.width };
  });
const recorte = { x: 0, y: 844 - 110, width: 390, height: 110 };

const amostras = [{ ms: 0, rota: "/app/inbox", ...(await gota()) }];
await page.screenshot({ path: path.join(SAIDA, "gota_0-inbox.jpg"), clip: recorte, ...JPEG });

// O toque: a navegação é do app (Link), então a barra não remonta. A rota nova
// compila no `next dev`, e a gota só anda quando o `aria-current` muda — a
// amostragem começa quando ele muda, não no clique.
await page.locator("nav[data-barra-inferior] a[href='/app/kanban']").click();
await page.waitForFunction(
  () =>
    document
      .querySelector("nav[data-barra-inferior] a[href='/app/kanban']")
      ?.getAttribute("aria-current") === "page",
  null,
  { timeout: 180_000 },
);
const t0 = Date.now();
for (const alvo of [60, 140, 240, 400, 700]) {
  await page.waitForTimeout(Math.max(0, alvo - (Date.now() - t0)));
  const ms = Date.now() - t0;
  amostras.push({ ms, rota: "/app/kanban", ...(await gota()) });
  await page.screenshot({ path: path.join(SAIDA, `gota_${alvo}ms.jpg`), clip: recorte, ...JPEG });
}
await browser.close();

fs.writeFileSync(path.join(SAIDA, "gota-morfose.json"), JSON.stringify(amostras, null, 2) + "\n");
process.stdout.write(JSON.stringify(amostras, null, 2) + "\n");
