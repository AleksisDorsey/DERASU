// Prova de tela do Derasu: screenshots e medidas dos materiais (vidro,
// superfície, fonte) nos dois temas, no desktop e no celular, com a
// transparência do sistema LIGADA e DESLIGADA.
//
// Por que emular a transparência: o Chrome lê "Efeitos de transparência" do
// Windows como `prefers-reduced-transparency`. Desligado na máquina, todo vidro
// cai no recuo (superfície opaca) e a prova mediria só metade do produto. O
// `Emulation.setEmulatedMedia` do protocolo do Chrome força cada valor.
//
// Uso (app de pé em http://localhost:3000, dono em .env.local):
//   node derasu/scripts/prova-de-tela.mjs <entrega> [rota ...]
//   node derasu/scripts/prova-de-tela.mjs <entrega> --so-readme   (só refaz o README)
// Saída: evidence/derasu-<entrega>/ (screenshots + medidas.json + README.md).
//
// O README cita cada imagem: `tests/unit/evidencia-citada.test.ts` reprova
// imagem versionada que nenhum documento cita.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const soReadme = process.argv.includes("--so-readme");
const args = process.argv.slice(2).filter((a) => a !== "--so-readme");
const entrega = args[0] ?? "fundacao";
const rotas = args.slice(1).length ? args.slice(1) : ["/app/crm", "/app/inbox"];
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SAIDA = path.join(RAIZ, "evidence", `derasu-${entrega}`);
fs.mkdirSync(SAIDA, { recursive: true });

const env = soReadme
  ? {}
  : Object.fromEntries(
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

async function medir(page) {
  return page.evaluate(() => {
    const cs = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        fundo: s.backgroundColor,
        borda: s.borderTopColor,
        desfoque: s.backdropFilter,
        sombra: s.boxShadow.slice(0, 120),
        raio: s.borderTopLeftRadius,
      };
    };
    return {
      tema: document.documentElement.dataset.theme,
      transparenciaReduzida: matchMedia("(prefers-reduced-transparency: reduce)").matches,
      fonte: getComputedStyle(document.body).fontFamily.split(",")[0],
      interCarregada: document.fonts.check('16px "Inter Derasu"'),
      fundoDaPagina: getComputedStyle(document.body).backgroundColor,
      cartao: cs(".ds-cartao"),
      barraLateral: cs(".ds-barra-lateral"),
      painel: cs(".ds-painel:not(.bg-primary)"),
    };
  });
}

if (!soReadme) {
const browser = await chromium.launch();
const medidas = [];
for (const [nomeVp, vp] of Object.entries(VIEWPORTS)) {
  for (const tema of ["light", "dark"]) {
    for (const transparencia of ["no-preference", "reduce"]) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile,
        colorScheme: tema,
        deviceScaleFactor: 2,
      });
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Emulation.setEmulatedMedia", {
        features: [
          { name: "prefers-reduced-transparency", value: transparencia },
          { name: "prefers-color-scheme", value: tema },
        ],
      });
      await page.goto(`${BASE}/login`);
      await page.getByLabel("Email").fill(env.LOCAL_OWNER_EMAIL);
      await page.getByLabel("Senha", { exact: true }).fill(env.LOCAL_OWNER_PASSWORD);
      await page.keyboard.press("Enter");
      await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 120_000 });
      // O tema do produto é atributo no <html>; força o do caso.
      for (const rota of rotas) {
        await page.goto(`${BASE}${rota}`, { waitUntil: "networkidle", timeout: 180_000 });
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
        await page.evaluate(() => document.fonts.ready);
        // Esqueleto na tela é carregamento, não o material: espera sumir.
        await page
          .waitForFunction(() => !document.querySelector(".ds-esqueleto, .animate-pulse"), null, {
            timeout: 60_000,
          })
          .catch(() => process.stdout.write(`aviso: esqueleto ainda na tela em ${rota}\n`));
        // O selo "Compiling" do `next dev` não é do produto.
        await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
        await page.waitForTimeout(600);
        const nome = `${rota.replace(/\W+/g, "-").replace(/^-|-$/g, "")}_${nomeVp}_${tema === "light" ? "claro" : "escuro"}_${transparencia === "reduce" ? "sem-transparencia" : "vidro"}`;
        await page.screenshot({ path: path.join(SAIDA, `${nome}.png`) });
        medidas.push({ caso: nome, ...(await medir(page)) });
        process.stdout.write(`ok ${nome}\n`);

        // Menu aberto (vidro denso sobre conteúdo): o seletor de organização do topo.
        if (!vp.isMobile && rota === rotas[0]) {
          const gatilho = page.locator("header button").filter({ hasText: /\S/ }).first();
          if (await gatilho.isVisible().catch(() => false)) {
            await gatilho.click();
            await page.waitForSelector(".ds-painel[data-state='open']", { timeout: 10_000 }).catch(() => {});
            await page.waitForTimeout(700);
            await page.screenshot({ path: path.join(SAIDA, `${nome}_menu.png`) });
            medidas.push({ caso: `${nome}_menu`, ...(await medir(page)) });
            process.stdout.write(`ok ${nome}_menu\n`);
            await page.keyboard.press("Escape");
          }
        }
      }
      await ctx.close();
    }
  }
}
await browser.close();
fs.writeFileSync(path.join(SAIDA, "medidas.json"), JSON.stringify(medidas, null, 2) + "\n");
process.stdout.write(`medidas em ${path.relative(RAIZ, SAIDA)}/medidas.json\n`);
}

// ---- README: cita cada captura e resume o que foi medido ------------------
const lidas = JSON.parse(fs.readFileSync(path.join(SAIDA, "medidas.json"), "utf8"));
const codigo = (v) => "`" + v + "`";
const secao = (m) => {
  const partes = [
    `tema ${codigo(m.tema)}`,
    `transparência reduzida: ${m.transparenciaReduzida ? "sim" : "não"}`,
    `fonte ${m.fonte}`,
    m.cartao ? `cartão ${codigo(m.cartao.fundo)}` : "sem cartão",
    m.barraLateral
      ? `barra lateral ${codigo(m.barraLateral.fundo)} / ${codigo(m.barraLateral.desfoque)}`
      : "sem barra lateral",
  ];
  if (m.painel) partes.push(`menu ${codigo(m.painel.fundo)} / ${codigo(m.painel.desfoque)}`);
  return `### ${m.caso}\n\n${partes.join("; ")}.\n\n![${m.caso}](${m.caso}.png)\n`;
};
fs.writeFileSync(
  path.join(SAIDA, "README.md"),
  [
    `# Prova de tela — derasu-${entrega}\n`,
    "Gerado por `derasu/scripts/prova-de-tela.mjs`: claro/escuro × desktop/celular ×",
    "transparência ligada/desligada (emulada pelo protocolo do Chrome). Valores lidos por",
    "`getComputedStyle`; o detalhe completo está em `medidas.json`.\n",
    ...lidas.map(secao),
  ].join("\n"),
);
process.stdout.write(`README em ${path.relative(RAIZ, SAIDA)}/README.md\n`);
