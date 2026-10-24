/**
 * Derasu — `NoLugar` desenha o controle do oficial no lugar que a barra
 * reserva, por portal, só no desktop e só quando o lugar existe (ADR 0005).
 * Uma instância só: o controle não é copiado, muda de lugar.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

import { EVENTO_DOS_LUGARES, NoLugar } from "@/components/derasu/NoLugar";

function comLargura(desktop: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: desktop,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  cleanup();
  document.getElementById("derasu-lugar-tema")?.remove();
});

describe("NoLugar", () => {
  it("no celular fica onde nasceu", () => {
    comLargura(false);
    const lugar = document.createElement("span");
    lugar.id = "derasu-lugar-tema";
    document.body.appendChild(lugar);
    render(
      <div data-testid="topo">
        <NoLugar lugar="tema">
          <button type="button">Tema</button>
        </NoLugar>
      </div>,
    );
    expect(screen.getByTestId("topo").contains(screen.getByRole("button"))).toBe(true);
    expect(lugar.childElementCount).toBe(0);
  });

  it("no desktop vai para o lugar, uma vez só", () => {
    comLargura(true);
    const lugar = document.createElement("span");
    lugar.id = "derasu-lugar-tema";
    document.body.appendChild(lugar);
    render(
      <div data-testid="topo">
        <NoLugar lugar="tema">
          <button type="button">Tema</button>
        </NoLugar>
      </div>,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(lugar.contains(screen.getByRole("button"))).toBe(true);
  });

  it("no desktop, sem o lugar, fica onde nasceu; e vai quando a barra avisa", () => {
    comLargura(true);
    render(
      <div data-testid="topo">
        <NoLugar lugar="tema">
          <button type="button">Tema</button>
        </NoLugar>
      </div>,
    );
    expect(screen.getByTestId("topo").contains(screen.getByRole("button"))).toBe(true);
    const lugar = document.createElement("span");
    lugar.id = "derasu-lugar-tema";
    document.body.appendChild(lugar);
    act(() => {
      window.dispatchEvent(new Event(EVENTO_DOS_LUGARES));
    });
    expect(lugar.contains(screen.getByRole("button"))).toBe(true);
  });
});
