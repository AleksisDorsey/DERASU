/**
 * Derasu — barra lateral do desktop fixada ou solta, com espiada (ADR 0004).
 *
 * O que estes testes protegem:
 *
 *  - fixada: a lâmina está na página e o clique no ícone a solta, gravando a
 *    preferência com o estado ATUAL (a mesma semântica do botão antigo);
 *  - solta: o mouse no ícone abre a espiada, e ela fica enquanto o mouse está
 *    nela; sair dos dois fecha só depois da espera (perdoa a diagonal);
 *  - Esc fecha; clicar no ícone durante a espiada fixa;
 *  - foco de teclado no ícone NÃO abre a espiada;
 *  - em tela de toque o clique só abre e fecha a espiada, sem gravar nada.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BarraLateral } from "@/components/derasu/BarraLateral";
import { toggleSidebar } from "@/app/actions/shell/toggleSidebar";
import type { ActiveOrg, AuthUser } from "@/lib/auth/types";

const authRef: { user: Pick<AuthUser, "is_platform_admin">; activeOrg: ActiveOrg | null } = {
  user: { is_platform_admin: false },
  activeOrg: { orgId: "org-1", name: "Org", role: "admin" },
};

vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => authRef,
  usePermission: () => false,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/app/inbox",
}));
vi.mock("@/components/connections/ConnectionHealthDot", () => ({
  ConnectionHealthDot: () => null,
}));
vi.mock("@/components/shell/ContadorDeCasos", () => ({
  ContadorDeCasos: () => null,
}));
vi.mock("@/components/shell/ContadorDaFila", () => ({
  ContadorDaFila: () => null,
}));
vi.mock("@/app/actions/shell/toggleSidebar", () => ({
  toggleSidebar: vi.fn(),
}));
vi.mock("@/components/shell/VersionFooter", () => ({
  VersionFooter: () => null,
}));

function comMouse(tem: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: tem,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function espiada(): HTMLElement {
  return document.querySelector(".ds-espiada") as HTMLElement;
}
function espiadaAberta(): boolean {
  return espiada().hasAttribute("data-aberta");
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.mocked(toggleSidebar).mockClear();
  comMouse(true);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function usuario() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

describe("BarraLateral — fixada", () => {
  it("mostra a lâmina e o clique no ícone a solta, gravando o estado atual", async () => {
    const user = usuario();
    render(<BarraLateral solta={false} />);
    expect(document.querySelector("aside.ds-barra-fixada")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Recolher sidebar" }));
    expect(vi.mocked(toggleSidebar)).toHaveBeenCalledWith(false);
    expect(document.querySelector("aside.ds-barra-fixada")).toBeNull();
  });

  it("o mouse no ícone não abre espiada com a barra fixada", async () => {
    const user = usuario();
    render(<BarraLateral solta={false} />);
    await user.hover(screen.getByRole("button", { name: "Recolher sidebar" }));
    expect(espiadaAberta()).toBe(false);
  });
});

describe("BarraLateral — solta", () => {
  it("não tem lâmina na página, e a espiada começa fechada e fora do teclado", () => {
    render(<BarraLateral solta />);
    expect(document.querySelector("aside.ds-barra-fixada")).toBeNull();
    expect(espiadaAberta()).toBe(false);
    expect(espiada().hasAttribute("inert")).toBe(true);
  });

  it("abre ao passar o mouse no ícone e fica enquanto o mouse está nela", async () => {
    const user = usuario();
    render(<BarraLateral solta />);
    const icone = screen.getByRole("button", { name: "Expandir sidebar" });
    await user.hover(icone);
    expect(espiadaAberta()).toBe(true);
    expect(icone.getAttribute("aria-expanded")).toBe("true");
    await user.hover(espiada());
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(espiadaAberta()).toBe(true);
  });

  it("sair do ícone e da barra fecha só depois da espera", async () => {
    const user = usuario();
    render(<BarraLateral solta />);
    const icone = screen.getByRole("button", { name: "Expandir sidebar" });
    await user.hover(icone);
    await user.unhover(icone);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(espiadaAberta()).toBe(true);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(espiadaAberta()).toBe(false);
  });

  it("Esc fecha", async () => {
    const user = usuario();
    render(<BarraLateral solta />);
    await user.hover(screen.getByRole("button", { name: "Expandir sidebar" }));
    await user.keyboard("{Escape}");
    expect(espiadaAberta()).toBe(false);
  });

  it("clicar no ícone durante a espiada fixa a barra", async () => {
    const user = usuario();
    render(<BarraLateral solta />);
    const icone = screen.getByRole("button", { name: "Expandir sidebar" });
    await user.hover(icone);
    await user.click(icone);
    expect(vi.mocked(toggleSidebar)).toHaveBeenCalledWith(true);
    expect(document.querySelector("aside.ds-barra-fixada")).not.toBeNull();
    expect(espiadaAberta()).toBe(false);
  });

  it("foco de teclado no ícone não abre a espiada", async () => {
    const user = usuario();
    render(<BarraLateral solta />);
    await user.tab();
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Expandir sidebar");
    expect(espiadaAberta()).toBe(false);
  });
});

describe("BarraLateral — tela de toque", () => {
  it("o toque abre e fecha a espiada, sem fixar nem gravar", async () => {
    comMouse(false);
    const user = usuario();
    render(<BarraLateral solta={false} />);
    const icone = screen.getByRole("button", { name: "Recolher sidebar" });
    await user.click(icone);
    expect(espiadaAberta()).toBe(true);
    await user.click(icone);
    expect(espiadaAberta()).toBe(false);
    expect(vi.mocked(toggleSidebar)).not.toHaveBeenCalled();
  });
});
