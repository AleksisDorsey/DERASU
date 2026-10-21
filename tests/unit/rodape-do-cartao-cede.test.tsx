/**
 * O RODAPÉ DO CARTÃO DO FUNIL CEDE EM VEZ DE SOBREPOR.
 *
 * Com nome de etapa longo, "Sem responsável" passava por baixo de "há 13h em
 * Carrinho abandonado". A causa era geométrica, não de fonte: a raiz do
 * `OwnerBadge` não tinha `min-w-0` (item flex não encolhe abaixo do conteúdo,
 * então o `truncate` do rótulo nunca agia) e o texto da etapa era `shrink-0`.
 * Os dois lados se recusavam a ceder. Agora quem cede é a etapa (a coluna já a
 * diz); o dono só trunca acima de um teto.
 *
 * jsdom não faz layout, então este arquivo vigia o CONTRATO que permite ceder;
 * a prova geométrica (caixas que não se interceptam) é a do Playwright em
 * `derasu/scripts/medir-rodape-do-cartao.mjs`, registrada em
 * `evidence/derasu-cartao-funil/`.
 */
import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));

import { OwnerBadge } from "@/components/kanban/OwnerBadge";

afterEach(cleanup);

describe("OwnerBadge pode encolher dentro de um flex", () => {
  it.each([
    ["sem responsável", null, null],
    ["pessoa", "user", "Maria Aparecida dos Santos Figueiredo"],
    ["agente", "ai", "Atendente de pós-venda"],
  ] as const)("%s: a raiz tem min-w-0 e o rótulo trunca", (_caso, kind, nome) => {
    const { container } = render(<OwnerBadge ownerKind={kind} ownerName={nome} />);
    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz.className).toContain("min-w-0");
    expect((raiz.lastElementChild as HTMLElement).className).toContain("truncate");
  });
});

describe("KanbanCard: o texto da etapa trunca em vez de empurrar", () => {
  const fonte = readFileSync(join(process.cwd(), "components/kanban/KanbanCard.tsx"), "utf8");
  // O span que escreve "<idade> em <etapa>".
  const span = fonte.match(/<span[^>]*>\s*\{state\.showStageAge/)?.[0] ?? "";

  it("acha o span da etapa no rodapé", () => {
    expect(span).not.toBe("");
  });

  it("não é shrink-0 nem só whitespace-nowrap: tem min-w-0 e truncate", () => {
    expect(span).not.toContain("shrink-0");
    expect(span).toContain("min-w-0");
    expect(span).toContain("truncate");
  });

  it("o lado do dono não cede antes da etapa, mas tem teto", () => {
    // A div que embrulha o OwnerBadge e o selo de tarefas.
    const dono = fonte.match(/<div className="([^"]*)">\s*<OwnerBadge/)?.[1] ?? "";
    expect(dono).toContain("shrink-0");
    expect(dono).toMatch(/max-w-\[\d+%\]/);
  });

  it("o nome inteiro fica a um hover", () => {
    expect(span).toContain("title={card.stageName}");
  });
});
