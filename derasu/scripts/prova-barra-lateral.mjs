// Prova da barra lateral fixada ou solta, com espiada (ADR 0004).
//
// Dirige o navegador como uma pessoa: fixa e solta pelo ícone, passa o mouse,
// sai, aperta Esc, escolhe um destino — e MEDE (posição do ícone, presença da
// lâmina, deslocamento da espiada, folga do topo) em vez de olhar a foto.
//
// Uso (app de pé, dono em .env.local):
//   BASE_URL=http://localhost:3000 node derasu/scripts/prova-barra-lateral.mjs
// Saída: evidence/derasu-barra-lateral/ (screenshots + medidas.json + README.md).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SAIDA = path.join(RAIZ, "evidence", "derasu-barra-lateral");
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

function foto(page, nome, legenda) {
  const arquivo = `${nome}.jpg`;
  imagens.push({ arquivo, legenda });
  return page.screenshot({ path: path.join(SAIDA, arquivo), ...JPEG });
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

async function ir(page, rota) {
  await page.goto(`${BASE}${rota}`, { waitUntil: "load", timeout: 180_000 });
  await page.evaluate(() => document.fonts.ready);
  await page
    .waitForFunction(() => !document.querySelector(".ds-esqueleto, .animate-pulse"), null, {
      timeout: 60_000,
    })
    .catch(() => {});
  // No desktop, os controles do topo chegam à barra por portal depois da
  // hidratação: mede só quando a busca já está na cápsula.
  const largura = page.viewportSize()?.width ?? 0;
  if (largura >= 768) {
    await page.waitForSelector("#derasu-lugar-buscar > button", { timeout: 60_000 });
  }
  await page.waitForTimeout(800);
}

/** O que importa para a barra, medido na página. */
function estado(page) {
  return page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return {
        x: Math.round(b.x),
        y: Math.round(b.y),
        w: Math.round(b.width),
        h: Math.round(b.height),
      };
    };
    const raiz = document.querySelector("[data-barra-lateral]");
    const icone = document.querySelector(".ds-icone-barra");
    const espiada = document.querySelector(".ds-espiada");
    const topo = document.querySelector(".ds-topo");
    // A primeira cápsula VISÍVEL (o hambúrguer do celular está lá, escondido).
    const primeiraCapsula = [...(topo?.querySelectorAll(".ds-capsulas-soltas > *") ?? [])].find(
      (el) => el.getBoundingClientRect().width > 0,
    );
    return {
      estado: raiz?.getAttribute("data-barra-lateral") ?? null,
      icone: r(icone),
      iconeRotulo: icone?.getAttribute("aria-label") ?? null,
      lamina: r(document.querySelector("aside.ds-barra-fixada")),
      laminaVisivel: (() => {
        const a = document.querySelector("aside.ds-barra-fixada");
        return a ? getComputedStyle(a).display !== "none" : false;
      })(),
      espiadaAberta: espiada?.hasAttribute("data-aberta") ?? false,
      espiada: r(espiada),
      espiadaVisivel: espiada ? getComputedStyle(espiada).visibility : null,
      main: r(document.querySelector("main")),
      topoPaddingEsquerda: topo ? getComputedStyle(topo).paddingLeft : null,
      primeiraCapsula: r(primeiraCapsula),
      // A linha da marca: continua o primeiro filho, com os 56px do `h-14`; a
      // marca é desenhada na faixa logo abaixo da cápsula (ADR 0005).
      cabecalho: r(document.querySelector("aside.ds-barra-fixada > div")),
      marca: r(document.querySelector("aside.ds-barra-fixada > div > *")),
      // A cápsula do canto e o que chegou a cada lugar (por portal, do topo).
      canto: r(document.querySelector(".ds-canto")),
      cantoItens: [
        ...(document
          .querySelector(".ds-canto")
          ?.querySelectorAll(
            ".ds-icone-barra, .ds-canto-item, [data-testid='alerts-bell'], #derasu-lugar-buscar > button",
          ) ?? []),
      ].map((el) => ({ nome: el.getAttribute("aria-label") ?? el.textContent?.trim(), ...r(el) })),
      pe: r(document.querySelector(".ds-pe")),
      lugares: Object.fromEntries(
        ["notificacoes", "buscar", "organizacao", "idioma", "tema"].map((l) => {
          const lugar = document.getElementById(`derasu-lugar-${l}`);
          const filho = lugar?.firstElementChild;
          return [
            l,
            filho
              ? {
                  testid: filho.getAttribute("data-testid"),
                  rotulo: filho.getAttribute("aria-label"),
                  ...r(filho),
                }
              : null,
          ];
        }),
      ),
      conta: r(document.querySelector(".ds-conta")),
      topoComControleVisivel: [...(topo?.querySelectorAll("button, a") ?? [])].filter(
        (el) => el.getBoundingClientRect().width > 0,
      ).length,
      url: location.pathname,
    };
  });
}

const browser = await chromium.launch();
try {
  for (const tema of ["light", "dark"]) {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: tema,
      deviceScaleFactor: 2,
    });
    const page = await entrar(ctx);
    await ir(page, "/app/crm");
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
    const m = {};

    // Começa FIXADA (padrão). Se uma rodada anterior deixou solta, fixa.
    if ((await estado(page)).estado === "solta") {
      await page.locator(".ds-icone-barra").click();
      await page.waitForTimeout(800);
    }
    m.fixada = await estado(page);
    await foto(
      page,
      `desktop_${tema}_fixada`,
      `Desktop ${tema === "light" ? "claro" : "escuro"}: barra fixada e encostada, com a cápsula do canto e o pé da barra`,
    );

    // O MENU DA CONTA, aberto para cima a partir do pé da barra.
    await page.getByRole("button", { name: "Menu do usuário" }).click();
    await page.waitForSelector("[role='menu']");
    await page.waitForTimeout(800);
    m.menuDaConta = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          "[role='menu'] [role='menuitem'], [role='menu'] [role='group'], [role='menu'] > div",
        ),
      ]
        .map((el) => el.textContent?.trim())
        .filter(Boolean),
    );
    await foto(
      page,
      `desktop_${tema}_menu_da_conta`,
      `Desktop ${tema === "light" ? "claro" : "escuro"}: menu da conta, aberto para cima`,
    );
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    if (tema === "light") {
      // SOLTA pelo clique.
      await page.locator(".ds-icone-barra").click();
      await page.mouse.move(900, 500); // tira o mouse do ícone
      await page.waitForTimeout(800);
      m.solta = await estado(page);
      await foto(
        page,
        "desktop_claro_solta",
        "Barra solta: só a cápsula do canto, de vidro, sobre o conteúdo",
      );

      // ESPIADA pelo mouse.
      const icone = await page.locator(".ds-icone-barra").boundingBox();
      await page.mouse.move(icone.x + icone.width / 2, icone.y + icone.height / 2);
      await page.waitForTimeout(700);
      m.espiadaAberta = await estado(page);
      await foto(
        page,
        "desktop_claro_espiada",
        "Espiada: a barra por cima do conteúdo, sem escurecer; o conteúdo não se move",
      );

      // Do ícone para dentro da barra: continua aberta.
      await page.mouse.move(120, 300, { steps: 8 });
      await page.waitForTimeout(600);
      m.mouseNaEspiada = await estado(page);

      // Para fora dos dois: segue aberta logo depois, fecha após a espera.
      // Um passo só: com vários, o próprio movimento já gasta a espera.
      await page.mouse.move(900, 500);
      m.saiuAgora = await estado(page);
      await page.waitForTimeout(700);
      m.saiuHa700ms = await estado(page);

      // Esc fecha.
      await page.mouse.move(icone.x + icone.width / 2, icone.y + icone.height / 2);
      await page.waitForTimeout(600);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      m.depoisDoEsc = await estado(page);

      // Escolher um destino fecha e navega.
      await page.mouse.move(900, 500);
      await page.waitForTimeout(400);
      await page.mouse.move(icone.x + icone.width / 2, icone.y + icone.height / 2);
      await page.waitForTimeout(600);
      await page.mouse.move(120, 300, { steps: 6 });
      await page.locator(".ds-espiada nav a[href='/app/contacts']").first().click();
      await page.waitForURL("**/app/contacts**", { timeout: 60_000 });
      await page.waitForTimeout(900);
      m.depoisDeEscolher = await estado(page);

      // Fixa de volta (deixa o cookie como estava).
      await page.locator(".ds-icone-barra").click();
      await page.mouse.move(900, 500);
      await page.waitForTimeout(800);
      m.fixadaDeNovo = await estado(page);
    } else {
      // Escuro: só a espiada, para ver o vidro sobre o conteúdo.
      await page.locator(".ds-icone-barra").click();
      await page.mouse.move(900, 500);
      await page.waitForTimeout(600);
      const icone = await page.locator(".ds-icone-barra").boundingBox();
      await page.mouse.move(icone.x + icone.width / 2, icone.y + icone.height / 2);
      await page.waitForTimeout(700);
      m.espiadaAberta = await estado(page);
      await foto(page, "desktop_escuro_espiada", "Desktop escuro: espiada");
      await page.locator(".ds-icone-barra").click(); // fixa de volta
      await page.waitForTimeout(600);
    }
    medidas[`desktop_${tema}`] = m;
    await ctx.close();
  }

  // TABLET DE TOQUE (sem hover): não existe fixar; o toque abre a espiada.
  {
    const ctx = await browser.newContext({
      viewport: { width: 820, height: 1180 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const page = await entrar(ctx);
    await ir(page, "/app/crm");
    const m = {};
    m.inicial = await estado(page);
    await foto(
      page,
      "tablet_toque_inicial",
      "Tablet de toque: sem barra fixada; a cápsula do canto sobre o conteúdo",
    );
    await page.locator(".ds-icone-barra").tap();
    await page.waitForTimeout(700);
    m.depoisDoToque = await estado(page);
    await foto(
      page,
      "tablet_toque_espiada",
      "Tablet de toque: o toque no ícone abre a barra por cima",
    );
    await page.locator(".ds-icone-barra").tap();
    await page.waitForTimeout(500);
    m.depoisDoSegundoToque = await estado(page);
    medidas.tablet_toque = m;
    await ctx.close();
  }
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(SAIDA, "medidas.json"), JSON.stringify(medidas, null, 2) + "\n");
const readme = [
  "# Prova da barra lateral fixada ou solta — Derasu",
  "",
  "Gerada por `derasu/scripts/prova-barra-lateral.mjs` (ADR 0004). As medidas de cada",
  "estado (posição do ícone, presença da lâmina, deslocamento da espiada, folga do topo)",
  "estão em [`medidas.json`](medidas.json).",
  "",
  ...imagens.flatMap(({ arquivo, legenda }) => [
    `## ${legenda}`,
    "",
    `![${legenda}](${arquivo})`,
    "",
  ]),
].join("\n");
fs.writeFileSync(path.join(SAIDA, "README.md"), readme);
process.stdout.write(`ok — ${imagens.length} imagens\n`);
