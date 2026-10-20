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
// Saída: evidence/derasu-<entrega>/ (screenshots + medidas.json).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const entrega = process.argv[2] ?? "fundacao";
const rotas = process.argv.slice(3).length ? process.argv.slice(3) : ["/app/crm", "/app/inbox"];
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
    const caixa = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (!r.width) return null;
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        largura: Math.round(r.width),
        altura: Math.round(r.height),
        folgaAteOFundo: Math.round(innerHeight - r.bottom),
      };
    };
    const gotaEl = document.querySelector("nav[data-barra-inferior] > ul");
    const gota = gotaEl ? getComputedStyle(gotaEl, "::before") : null;
    const topo = document.querySelector(".ds-topo");
    const efeito = topo ? getComputedStyle(topo, "::before") : null;
    return {
      tema: document.documentElement.dataset.theme,
      transparenciaReduzida: matchMedia("(prefers-reduced-transparency: reduce)").matches,
      fonte: getComputedStyle(document.body).fontFamily.split(",")[0],
      interCarregada: document.fonts.check('16px "Inter Derasu"'),
      fundoDaPagina: getComputedStyle(document.body).backgroundColor,
      cartao: cs(".ds-cartao"),
      barraLateral: cs(".ds-barra-lateral"),
      painel: cs(".ds-painel"),
      modal: cs(".ds-modal"),
      // Entrega 2 — camada de controle.
      topo: topo
        ? {
            fundo: getComputedStyle(topo).backgroundColor,
            linhaDeBaixo: getComputedStyle(topo).borderBottomWidth,
            efeitoDeBorda: efeito && {
              desfoque: efeito.backdropFilter,
              mascara: efeito.maskImage.slice(0, 80),
              altura: efeito.height,
            },
          }
        : null,
      capsulaAgrupada: cs(".ds-capsula"),
      capsulaSolta: cs(".ds-capsulas-soltas > :is(button, a)"),
      caixaDaBarraLateral: caixa(".ds-barra-lateral"),
      barraDeAbas: cs("nav[data-barra-inferior] > ul"),
      caixaDaNavDeAbas: caixa("nav[data-barra-inferior]"),
      caixaDaCapsulaDeAbas: caixa("nav[data-barra-inferior] > ul"),
      gota: gota && {
        opacidade: gota.opacity,
        translate: gota.translate,
        largura: gota.width,
        fundo: gota.backgroundColor,
      },
      rodapeDescontado: (() => {
        const m = document.querySelector("main");
        return m ? getComputedStyle(m).paddingBottom : null;
      })(),
    };
  });
}

// GPU, e não o compositor por software padrão do headless: com ele o
// `backdrop-filter` falha de forma intermitente — a mesma lâmina desfoca
// sobre um trecho e deixa o texto nítido sobre outro —, e a prova mostrava
// vidro sem desfoque que o navegador de verdade desfoca. Medido lado a lado
// em 20/10/2026 (entrega 2), com lâminas de teste na mesma página.
const browser = await chromium.launch({
  args: ["--enable-gpu", "--use-angle=d3d11", "--ignore-gpu-blocklist"],
});
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
        await page.screenshot({ path: path.join(SAIDA, `${nome}.jpg`), ...JPEG });
        medidas.push({ caso: nome, ...(await medir(page)) });
        process.stdout.write(`ok ${nome}\n`);

        // Conteúdo rolado: o efeito de borda do topo sobre o que passa por baixo.
        const rolou = await page.evaluate(() => {
          scrollTo(0, 320);
          return scrollY > 0;
        });
        if (rolou) {
          await page.waitForTimeout(400);
          await page.screenshot({ path: path.join(SAIDA, `${nome}_rolado.jpg`), ...JPEG });
          process.stdout.write(`ok ${nome}_rolado\n`);
          await page.evaluate(() => scrollTo(0, 0));
        }

        // Dica (tooltip): nenhuma tela de prova tem uma à mão sem dado (a única
        // na inbox é a de mensagem com erro), então o balão é montado com a
        // MESMA classe base do primitivo e o estado que o Radix emite. Prova o
        // material, não o gatilho.
        if (!vp.isMobile && rota === rotas[0]) {
          await page.evaluate(() => {
            const d = document.createElement("div");
            d.id = "prova-dica";
            d.dataset.state = "delayed-open";
            d.className =
              "ds-painel z-50 max-w-xs overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-xs break-words text-popover-foreground";
            d.style.cssText = "position:fixed;top:120px;left:420px";
            d.textContent = "Mensagem não entregue: o número não tem WhatsApp.";
            document.body.appendChild(d);
          });
          await page.waitForTimeout(300);
          await page.screenshot({
            path: path.join(SAIDA, `${nome}_dica.jpg`),
            ...JPEG,
            clip: { x: 380, y: 90, width: 460, height: 110 },
          });
          const dica = await page.evaluate(() => {
            const s = getComputedStyle(document.getElementById("prova-dica"));
            return {
              fundo: s.backgroundColor,
              texto: s.color,
              desfoque: s.backdropFilter,
              raio: s.borderTopLeftRadius,
            };
          });
          medidas.push({ caso: `${nome}_dica`, dica });
          await page.evaluate(() => document.getElementById("prova-dica")?.remove());
          process.stdout.write(`ok ${nome}_dica\n`);
        }

        // Menu aberto (vidro denso sobre conteúdo): o seletor de organização do topo.
        if (!vp.isMobile && rota === rotas[0]) {
          const gatilho = page.locator("header button").filter({ hasText: /\S/ }).first();
          if (await gatilho.isVisible().catch(() => false)) {
            await gatilho.click();
            await page
              .waitForSelector(".ds-painel[data-state='open']", { timeout: 10_000 })
              .catch(() => {});
            await page.waitForTimeout(700);
            await page.screenshot({ path: path.join(SAIDA, `${nome}_menu.jpg`), ...JPEG });
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
