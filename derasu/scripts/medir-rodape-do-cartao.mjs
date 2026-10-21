// Mede o rodapé do cartão do funil: o rótulo do responsável e o "<idade> em
// <etapa>" não podem se interceptar, e nenhum dos dois pode vazar do cartão.
//
// A sobreposição nasceu de um flex que não cedia: a raiz do `OwnerBadge` sem
// `min-w-0` (o `truncate` do rótulo nunca agia) e o texto da etapa `shrink-0`.
// A Inter, mais larga que a Atkinson do oficial, só deixava o defeito à vista
// mais cedo — por isso cada caso roda com as duas fontes.
//
// Uso (app de pé em http://localhost:3000, dono em .env.local; no Git Bash,
// `MSYS_NO_PATHCONV=1`, senão a rota vira caminho do Windows):
//   node derasu/scripts/medir-rodape-do-cartao.mjs <nome> <rota> [--sem-conserto] [--etapa-longa] [--dono-longo]
//   --sem-conserto  desfaz no DOM as propriedades que o conserto mudou
//                   (min-width, max-width e flex-shrink) — o "antes" a partir
//                   do mesmo build; no desktop ele bate ao décimo de pixel com
//                   o código antigo medido de verdade
//   --etapa-longa   renomeia, só no DOM, a etapa de cada cartão para um nome
//                   longo — o caso que o seed não tem e que um cliente cria
//   --dono-longo    idem para o nome do responsável (o seed não tem dono)
// Saída: evidence/derasu-cartao-funil/<nome>.json e um recorte por caso.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const [nome = "rodape", ROTA = "/app/pipelines"] = process.argv
  .slice(2)
  .filter((a) => !a.startsWith("--"));
const semConserto = process.argv.includes("--sem-conserto");
const etapaLonga = process.argv.includes("--etapa-longa");
const donoLongo = process.argv.includes("--dono-longo");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SAIDA = path.join(RAIZ, "evidence", "derasu-cartao-funil");
fs.mkdirSync(SAIDA, { recursive: true });
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(RAIZ, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, isMobile: false },
  celular: { width: 390, height: 844, isMobile: true },
};
const ATKINSON = `:root,body,body *{font-family:var(--font-atkinson),ui-sans-serif,system-ui,sans-serif!important}`;
const ETAPA_LONGA = "Aguardando retorno do financeiro";
const DONO_LONGO = "Maria Aparecida dos Santos Figueiredo";

async function medir(page) {
  return page.evaluate(
    ({ semConserto, etapaLonga, donoLongo, ETAPA_LONGA, DONO_LONGO }) => {
      const cartoes = [...document.querySelectorAll("[data-rfd-draggable-id]")];
      return cartoes
        .map((cartao) => {
          const rodape = [...cartao.querySelectorAll(":scope > div")]
            .filter((d) => d.classList.contains("justify-between") && d.classList.contains("h-6"))
            .pop();
          if (!rodape) return null;
          const [esquerda, etapa] = rodape.children;
          const badge = esquerda.firstElementChild;
          if (semConserto) {
            esquerda.style.flexShrink = "1";
            esquerda.style.maxWidth = "none";
            badge.style.minWidth = "auto";
            etapa.style.minWidth = "auto";
            etapa.style.flexShrink = "0";
          }
          if (etapaLonga)
            etapa.textContent = etapa.textContent.replace(
              /( em ).*$|^(em ).*$/,
              (m, a, b) => `${a ?? b}${ETAPA_LONGA}`,
            );
          const rotulo = badge.lastElementChild;
          if (donoLongo) rotulo.textContent = DONO_LONGO;
          const a = rotulo.getBoundingClientRect();
          const b = etapa.getBoundingClientRect();
          const c = cartao.getBoundingClientRect();
          const arred = (n) => +n.toFixed(1);
          return {
            id: cartao.dataset.rfdDraggableId,
            titulo: cartao.querySelector("h3")?.textContent?.trim(),
            larguraDoCartao: Math.round(c.width),
            rotulo: {
              texto: rotulo.textContent,
              esquerda: arred(a.left),
              direita: arred(a.right),
              truncado: rotulo.scrollWidth > rotulo.clientWidth,
            },
            etapa: {
              texto: etapa.textContent,
              esquerda: arred(b.left),
              direita: arred(b.right),
              truncado: etapa.scrollWidth > etapa.clientWidth,
            },
            // Caixas que se interceptam na horizontal (estão na mesma linha de 24px).
            intercepta: a.right > b.left + 0.5 && a.left < b.right - 0.5,
            folga: arred(b.left - a.right),
            vazaDoCartao: Math.max(a.right, b.right) > c.right - 12 + 0.5,
          };
        })
        .filter(Boolean);
    },
    { semConserto, etapaLonga, donoLongo, ETAPA_LONGA, DONO_LONGO },
  );
}

const browser = await chromium.launch({
  args: ["--enable-gpu", "--use-angle=d3d11", "--ignore-gpu-blocklist"],
});
// Um login só: oito logins seguidos esbarram no limite de tentativas do /login.
const login = await browser.newContext();
const lp = await login.newPage();
await lp.goto(`${BASE}/login`);
await lp.getByLabel("Email").fill(env.LOCAL_OWNER_EMAIL);
await lp.getByLabel("Senha", { exact: true }).fill(env.LOCAL_OWNER_PASSWORD);
await lp.keyboard.press("Enter");
await lp.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 120_000 });
const storageState = await login.storageState();
await login.close();

const resultado = [];
let falhas = 0;
for (const [nomeVp, vp] of Object.entries(VIEWPORTS)) {
  for (const tema of ["light", "dark"]) {
    for (const fonte of ["inter", "atkinson"]) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile,
        colorScheme: tema,
        deviceScaleFactor: 2,
        storageState,
      });
      const page = await ctx.newPage();
      await page.goto(`${BASE}${ROTA}`, { waitUntil: "networkidle", timeout: 600_000 });
      await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
      if (fonte === "atkinson") await page.addStyleTag({ content: ATKINSON });
      await page.waitForSelector("[data-rfd-draggable-id] h3 button", { timeout: 600_000 });
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      await page.waitForTimeout(400);
      const fonteEfetiva = await page.evaluate(
        () => getComputedStyle(document.querySelector("h3")).fontFamily.split(",")[0],
      );
      const cartoes = await medir(page);
      const caso = `${nome}_${nomeVp}_${tema === "light" ? "claro" : "escuro"}_${fonte}`;
      resultado.push({ caso, fonteEfetiva, cartoes });

      // Recorte: o primeiro cartão do seed com etapa longa (ou o primeiro que houver).
      const alvo = cartoes.find((c) => /Kit clareamento/.test(c.titulo ?? "")) ?? cartoes[0];
      if (alvo) {
        const el = page.locator(`[data-rfd-draggable-id="${alvo.id}"]`);
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        const r = await el.boundingBox();
        await page.screenshot({
          path: path.join(SAIDA, `${caso}.jpg`),
          type: "jpeg",
          quality: 88,
          clip: {
            x: Math.max(0, r.x - 8),
            y: Math.max(0, r.y - 8),
            width: r.width + 16,
            height: r.height + 16,
          },
        });
      }

      const ruins = cartoes.filter((c) => c.intercepta || c.vazaDoCartao);
      falhas += ruins.length;
      process.stdout.write(
        `${caso} (${fonteEfetiva}): ${cartoes.length} cartões, ${ruins.length} com sobreposição/vazamento\n`,
      );
      for (const c of ruins)
        process.stdout.write(
          `   ✗ ${c.titulo} | "${c.rotulo.texto}" até ${c.rotulo.direita} × "${c.etapa.texto}" desde ${c.etapa.esquerda}\n`,
        );
      await ctx.close();
    }
  }
}
await browser.close();
fs.writeFileSync(path.join(SAIDA, `${nome}.json`), JSON.stringify(resultado, null, 2) + "\n");
process.stdout.write(`total: ${falhas} cartões com sobreposição/vazamento\n`);
