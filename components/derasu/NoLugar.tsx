"use client";
import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Derasu — desenha um controle do oficial em outro lugar da tela, no desktop,
 * SEM criar uma segunda cópia dele (ADR 0005).
 *
 * O sino toca o som da central, a busca registra o Ctrl+K e o tema registra o
 * Ctrl+Shift+L: duas cópias tocariam o som em dobro e abririam e fechariam a
 * paleta no mesmo atalho. Por isso o controle continua nascendo onde nasce (no
 * topo) e, a partir de 768px, é desenhado por portal no lugar que a barra
 * lateral reserva (`#derasu-lugar-<nome>`, em `BarraLateral.tsx`). Abaixo disso,
 * e antes da hidratação, fica onde sempre esteve.
 *
 * A barra avisa com o evento `derasu:lugares` quando os lugares existem.
 */
export type Lugar = "notificacoes" | "buscar" | "organizacao" | "idioma" | "tema";

export const EVENTO_DOS_LUGARES = "derasu:lugares";
const DESKTOP = "(min-width: 768px)";

function assinar(aviso: () => void) {
  const mq = typeof window.matchMedia === "function" ? window.matchMedia(DESKTOP) : null;
  mq?.addEventListener("change", aviso);
  window.addEventListener(EVENTO_DOS_LUGARES, aviso);
  return () => {
    mq?.removeEventListener("change", aviso);
    window.removeEventListener(EVENTO_DOS_LUGARES, aviso);
  };
}

function alvoNoDesktop(lugar: Lugar): HTMLElement | null {
  if (typeof window.matchMedia !== "function" || !window.matchMedia(DESKTOP).matches) return null;
  return document.getElementById(`derasu-lugar-${lugar}`);
}

export function NoLugar({ lugar, children }: { lugar: Lugar; children: ReactNode }) {
  const alvo = useSyncExternalStore(
    assinar,
    () => alvoNoDesktop(lugar),
    () => null,
  );
  return alvo ? createPortal(children, alvo) : <>{children}</>;
}
