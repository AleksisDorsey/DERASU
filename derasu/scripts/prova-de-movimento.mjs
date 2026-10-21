// Prova do movimento do Derasu (entrega 5): pressionar, painéis que nascem do
// gatilho, modal e gaveta em mola, e a entrada de rota pela View Transitions.
//
// Movimento não se prova com uma foto do fim: o script AMOSTRA a propriedade
// animada (`getComputedStyle` devolve o valor no meio da transição) em vários
// instantes, e fotografa o meio da animação com o relógio de animações do
// Chrome desacelerado (`Animation.setPlaybackRate`, protocolo do Chrome).
//
// Uso (app de pé, dono em .env.local):
//   BASE_URL=http://localhost:3001 node derasu/scripts/prova-de-movimento.mjs
// Saída: evidence/derasu-movimento/ (screenshots + medidas.json + README.md).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SAIDA = path.join(RAIZ, "evidence", "derasu-movimento");
const CONVERSA = process.env.CONVERSA ?? "d0000000-0000-4000-8000-000000000301";
fs.mkdirSync(SAIDA, { recursive: true });

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(RAIZ, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);

const JPEG = { type: "jpeg", quality: 82 };
const medidas = {};
const imagens = [];

function foto(page, nome, legenda, opcoes = {}) {
  const arquivo = `${nome}.jpg`;
  imagens.push({ arquivo, legenda });
  return page.screenshot({ path: path.join(SAIDA, arquivo), ...JPEG, ...opcoes });
}

/** Amostra `props` de `sel` nos instantes `ms` (contados de agora). */
async function amostrar(page, sel, props, ms) {
  return page.evaluate(
    async ({ sel, props, ms }) => {
      const t0 = performance.now();
      const saida = [];
      for (const alvo of ms) {
        while (performance.now() - t0 < alvo) await new Promise(requestAnimationFrame);
        const el = document.querySelector(sel);
        const s = el ? getComputedStyle(el) : null;
        saida.push({
          ms: Math.round(performance.now() - t0),
          ...Object.fromEntries(props.map((p) => [p, s ? s.getPropertyValue(p) : null])),
        });
      }
      return saida;
    },
    { sel, props, ms },
  );
}

async function entrar(ctx) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(env.LOCAL_OWNER_EMAIL);
  await page.getByLabel("Senha", { exact: true }).fill(env.LOCAL_OWNER_PASSWORD);
  await page.keyboard.press("Enter");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 120_000 });
  return page;
}

async function ir(page, rota, waitUntil = "networkidle") {
  await page.goto(`${BASE}${rota}`, { waitUntil, timeout: 180_000 });
  await page.evaluate(() => document.fonts.ready);
  await page
    .waitForFunction(() => !document.querySelector(".ds-esqueleto, .animate-pulse"), null, {
      timeout: 60_000,
    })
    .catch(() => {});
}

/** Conta as View Transitions que a página inicia e guarda as animações delas. */
async function vigiarTransicoes(page) {
  await page.evaluate(() => {
    window.__vt = [];
    const original = document.startViewTransition?.bind(document);
    if (!original) return;
    document.startViewTransition = (arg) => {
      const vt = original(arg);
      const registro = { inicio: performance.now(), animacoes: [] };
      window.__vt.push(registro);
      vt.ready
        .then(() => {
          registro.animacoes = document
            .getAnimations()
            .filter((a) => a.effect?.pseudoElement?.startsWith("::view-transition"))
            .map((a) => ({
              pseudo: a.effect.pseudoElement,
              nome: a.animationName,
              duracao: a.effect.getComputedTiming().duration,
              curva: a.effect.getComputedTiming().easing.slice(0, 40),
            }));
        })
        .catch(() => {});
      return vt;
    };
  });
}

const browser = await chromium.launch();
try {
  // ─── DESKTOP ───────────────────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
      deviceScaleFactor: 2,
    });
    const page = await entrar(ctx);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Animation.enable");
    await ir(page, "/app/contacts");

    // 1. PRESSIONAR — um botão do primitivo, segurado e solto.
    const botao = page.locator("main .ds-pressionar:visible").first();
    const caixa = await botao.boundingBox();
    await botao.evaluate((el) => el.setAttribute("data-prova", "botao"));
    const alvoBotao = "[data-prova='botao']";
    await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
    await page.mouse.down();
    medidas.pressionarDescida = await amostrar(page, alvoBotao, ["scale"], [0, 60, 150, 250]);
    await foto(page, "desktop_claro_pressionar_botao", "Botão pressionado: encolhe para 96% enquanto está seguro", {
      clip: { x: caixa.x - 24, y: caixa.y - 16, width: caixa.width + 48, height: caixa.height + 32 },
    });
    // Solta FORA do botão: a volta em mola é a mesma, e o clique não dispara.
    await page.mouse.move(5, 450);
    await page.mouse.up();
    medidas.pressionarVolta = await amostrar(page, alvoBotao, ["scale"], [0, 80, 160, 240, 320, 450, 650]);

    // 1b. O cartão que é link (a grade do hub de CRM) afunda menos.
    await ir(page, "/app/crm");
    await page.evaluate(() => document.querySelector("main a > .ds-cartao")?.setAttribute("data-prova", "cartao"));
    const cartao = page.locator("[data-prova='cartao']");
    const caixaCartao = await cartao.boundingBox();
    await page.mouse.move(caixaCartao.x + caixaCartao.width / 2, caixaCartao.y + caixaCartao.height / 2);
    await page.mouse.down();
    medidas.cartaoPressionado = await amostrar(page, "[data-prova='cartao']", ["scale", "translate"], [0, 150]);
    await page.mouse.move(5, 450);
    await page.mouse.up();
    await page.waitForTimeout(800);

    // 2. PAINEL QUE NASCE DO GATILHO — o menu da pessoa, no topo.
    const gatilho = page.locator(".ds-topo button[aria-label='Menu do usuário']");
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.15 });
    await gatilho.click();
    await page.waitForSelector("[role='menu']");
    medidas.menuAbrindo = await amostrar(page, "[role='menu']", ["opacity", "scale", "transform-origin", "animation-name"], [0, 300, 700, 1400, 4200]);
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.05 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
    await page.waitForTimeout(600);
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.08 });
    await gatilho.click();
    await page.waitForTimeout(120);
    await foto(page, "desktop_claro_menu_nascendo", "Menu no meio da abertura (relógio a 8%): cresce a partir do botão que o abriu", {
      clip: { x: 900, y: 0, width: 540, height: 420 },
    });
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
    await page.waitForTimeout(800);
    await foto(page, "desktop_claro_menu_aberto", "Menu assentado", { clip: { x: 900, y: 0, width: 540, height: 420 } });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // 3. MODAL — a paleta de comandos (⌘K / Ctrl+K).
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.15 });
    await page.keyboard.press("Control+k");
    await page.waitForSelector("[role='dialog']");
    medidas.modalAbrindo = await amostrar(page, "[role='dialog']", ["opacity", "scale", "translate", "animation-name"], [0, 300, 900, 4200]);
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
    await page.waitForTimeout(800);
    await foto(page, "desktop_claro_modal_aberto", "Paleta de comandos (modal) assentada depois da entrada em mola");
    await page.keyboard.press("Escape");
    const fechou = await page
      .waitForSelector(".ds-cortina", { state: "detached", timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    medidas.modalFechouComEsc = fechou;
    if (!fechou) {
      medidas.modalDepoisDoEsc = await page.evaluate(() =>
        [...document.querySelectorAll(".ds-cortina, [role='dialog']")].map((el) => ({
          classe: el.className.slice(0, 60),
          estado: el.getAttribute("data-state"),
          animacao: getComputedStyle(el).animationName,
          animacoes: el.getAnimations().map((a) => `${a.animationName}:${a.playState}:${a.currentTime}`),
        })),
      );
      process.stdout.write(`modal não fechou: ${JSON.stringify(medidas.modalDepoisDoEsc)}
`);
      await page.reload({ waitUntil: "networkidle" });
    }

    // 4. ENTRADA DE ROTA — da área de CRM para a inbox, pela barra lateral.
    await vigiarTransicoes(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.1 });
    await page.locator(".ds-barra-lateral nav a[href='/app/inbox']").first().click();
    await page.waitForFunction(() => window.__vt.length > 0, null, { timeout: 30_000 });
    await page.waitForTimeout(250);
    await foto(page, "desktop_claro_rota_no_meio", "Troca de área no meio (relógio a 10%): a página do CRM esmaece e a inbox sobe 8px");
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
    await page.waitForURL("**/app/inbox**");
    await page.waitForTimeout(1200);
    medidas.rotaAreaParaArea = await page.evaluate(() => window.__vt.map((v) => v.animacoes));

    // 4b. Mesma área: trocar de conversa NÃO anima a página.
    await ir(page, `/app/inbox?id=${CONVERSA}`, "load");
    await page.waitForTimeout(3000);
    await vigiarTransicoes(page);
    // O seed tem uma conversa só: a troca de `?id=` vai pelo roteador do app
    // (o mesmo `router.push` que a lista usa), ida e volta. As duas são
    // navegações dentro da área da inbox, e nenhuma pode animar a página.
    await page.evaluate(async (id) => {
      window.next.router.push("/app/inbox");
      await new Promise((r) => setTimeout(r, 1500));
      window.next.router.push(`/app/inbox?id=${id}`);
      await new Promise((r) => setTimeout(r, 1500));
    }, CONVERSA);
    medidas.rotaMesmaAreaNavegacoes = await page.evaluate(() => location.search);
    medidas.rotaMesmaArea = await page.evaluate(() =>
      window.__vt.map((v) => v.animacoes.filter((a) => /ds-rota/.test(a.nome))),
    );
    await foto(page, "desktop_claro_inbox_depois_da_rota", "Inbox depois da troca de área, assentada");
    await ctx.close();
  }

  // ─── CELULAR ──────────────────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      colorScheme: "dark",
      deviceScaleFactor: 3,
    });
    const page = await entrar(ctx);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Animation.enable");
    await ir(page, "/app/crm");
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));

    // 5. GAVETA — a navegação do celular, que entra em mola suave.
    const abrirMenu = page.locator(".ds-topo button").first();
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.15 });
    await abrirMenu.click();
    await page.waitForSelector(".ds-gaveta");
    medidas.gavetaAbrindo = await amostrar(page, ".ds-gaveta", ["translate", "animation-name"], [0, 400, 1000, 2000, 3500]);
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.08 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
    await page.waitForTimeout(800);
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.08 });
    await abrirMenu.click();
    await page.waitForTimeout(500);
    await foto(page, "celular_escuro_gaveta_entrando", "Gaveta de navegação no meio da entrada (relógio a 8%), sem passar da borda");
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);

    // 6. PRESSIONAR na barra de abas.
    const aba = page.locator("nav[data-barra-inferior] a").nth(1);
    await page.evaluate(() =>
      document.querySelectorAll("nav[data-barra-inferior] a")[1]?.setAttribute("data-prova", "aba"),
    );
    const caixaAba = await aba.boundingBox();
    await page.mouse.move(caixaAba.x + caixaAba.width / 2, caixaAba.y + caixaAba.height / 2);
    await page.mouse.down();
    medidas.abaPressionada = await amostrar(page, "[data-prova='aba']", ["scale"], [0, 150]);
    await foto(page, "celular_escuro_aba_pressionada", "Aba da barra inferior pressionada: encolhe para 90%", {
      clip: { x: 0, y: 844 - 120, width: 390, height: 120 },
    });
    await page.mouse.move(195, 300);
    await page.mouse.up();
    await page.waitForTimeout(1500);
    await ctx.close();
  }

  // ─── MOVIMENTO REDUZIDO ───────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
      deviceScaleFactor: 1,
    });
    const page = await entrar(ctx);
    await ir(page, "/app/contacts");
    const botao = page.locator("main .ds-pressionar:visible").first();
    await botao.evaluate((el) => el.setAttribute("data-prova", "botao"));
    const caixa = await botao.boundingBox();
    await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
    await page.mouse.down();
    medidas.reduzidoPressionar = await amostrar(page, "[data-prova='botao']", ["scale"], [0, 150]);
    await page.mouse.move(5, 450);
    await page.mouse.up();
    await vigiarTransicoes(page);
    await page.locator(".ds-barra-lateral nav a[href='/app/inbox']").first().click();
    await page.waitForURL("**/app/inbox**");
    await page.waitForTimeout(1500);
    medidas.reduzidoRota = await page.evaluate(() => window.__vt.map((v) => v.animacoes));
    await ctx.close();
  }
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(SAIDA, "medidas.json"), JSON.stringify(medidas, null, 2) + "\n");
const readme = [
  "# Prova de movimento — Derasu, entrega 5",
  "",
  "Gerada por `derasu/scripts/prova-de-movimento.mjs`. As medidas (valor da propriedade",
  "animada amostrado em vários instantes) estão em [`medidas.json`](medidas.json); as fotos do",
  "meio de cada animação foram tiradas com o relógio de animações do Chrome desacelerado.",
  "",
  ...imagens.flatMap(({ arquivo, legenda }) => [`## ${legenda}`, "", `![${legenda}](${arquivo})`, ""]),
].join("\n");
fs.writeFileSync(path.join(SAIDA, "README.md"), readme);
process.stdout.write(`ok — ${imagens.length} imagens\n`);
