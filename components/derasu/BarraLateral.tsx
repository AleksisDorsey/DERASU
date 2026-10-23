"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";

import { toggleSidebar } from "@/app/actions/shell/toggleSidebar";
import { SidebarContent } from "@/components/shell/Sidebar";
import { useT } from "@/hooks/i18n/useT";
// Direto do pacote, e não do barril `lib/ui/icons.ts`: acrescentar o ícone lá
// seria mexer num arquivo do oficial por um nome só. Mesma variante (`ssr`).
import { SidebarSimple } from "@phosphor-icons/react/dist/ssr";

/**
 * Derasu — a barra lateral do desktop, FIXADA ou SOLTA (ADR 0004).
 *
 * - Fixada: a lâmina ocupa o próprio lugar ao lado do conteúdo, como antes.
 * - Solta: a lâmina sai da tela; o ícone fica no canto de cima à esquerda e a
 *   ESPIADA a mostra por cima do conteúdo enquanto o mouse está no ícone ou nela.
 *
 * Só o clique no ícone fixa e solta. Em tela de toque (sem hover) não existe
 * fixar: o toque no ícone abre e fecha a espiada, e o CSS tira a lâmina fixada
 * de cena — o critério é o aparelho, não a largura.
 *
 * O estado vem do cookie `sidebar_collapsed` ("1" = solta), lido no servidor
 * para a primeira pintura já sair certa; o clique muda a tela na hora e grava o
 * cookie pela mesma ação que o oficial usava para recolher.
 *
 * O ícone fica no MESMO ponto da tela nos dois estados (`position: fixed`), por
 * cima do alto da lâmina quando ela está fixada. Medidas e materiais em
 * app/globals.css ("LIQUID GLASS", 4e).
 */

/** Quanto a espiada espera, com o mouse fora, antes de sumir: perdoa a diagonal. */
const ESPERA_PARA_FECHAR_MS = 300;

function temHover(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}

export function BarraLateral({ solta: soltaDoServidor }: { solta: boolean }) {
  const t = useT();
  const pathname = usePathname();
  const [solta, setSolta] = useState(soltaDoServidor);
  const [espiando, setEspiando] = useState(false);
  // A espiada só monta o conteúdo na primeira vez que abre. Com a barra
  // fixada e mouse, ela nunca abre — e não deixa uma segunda "Navegação
  // principal" escondida na página.
  const [jaAbriu, setJaAbriu] = useState(false);
  const [, startTransition] = useTransition();
  const fechamento = useRef<ReturnType<typeof setTimeout> | null>(null);
  const icone = useRef<HTMLButtonElement>(null);
  const espiada = useRef<HTMLDivElement>(null);

  // Ajustes durante a renderização, e não em efeito (o padrão do React para
  // estado que acompanha uma prop): o servidor manda quando muda de ideia
  // (outra aba, revalidação), e trocar de página termina a espiada.
  const [soltaAnterior, setSoltaAnterior] = useState(soltaDoServidor);
  if (soltaDoServidor !== soltaAnterior) {
    setSoltaAnterior(soltaDoServidor);
    setSolta(soltaDoServidor);
  }
  const [paginaAnterior, setPaginaAnterior] = useState(pathname);
  if (pathname !== paginaAnterior) {
    setPaginaAnterior(pathname);
    setEspiando(false);
  }

  function abrir() {
    setJaAbriu(true);
    setEspiando(true);
  }

  const cancelarFechamento = useCallback(() => {
    if (fechamento.current) clearTimeout(fechamento.current);
    fechamento.current = null;
  }, []);
  const fechar = useCallback(() => {
    cancelarFechamento();
    setEspiando(false);
  }, [cancelarFechamento]);
  const fecharDaquiAPouco = useCallback(() => {
    cancelarFechamento();
    fechamento.current = setTimeout(() => setEspiando(false), ESPERA_PARA_FECHAR_MS);
  }, [cancelarFechamento]);

  useEffect(() => cancelarFechamento, [cancelarFechamento]);

  // Esc e clique fora fecham.
  useEffect(() => {
    if (!espiando) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") fechar();
    }
    function aoApertar(e: PointerEvent) {
      const alvo = e.target as Node;
      if (icone.current?.contains(alvo) || espiada.current?.contains(alvo)) return;
      fechar();
    }
    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("pointerdown", aoApertar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("pointerdown", aoApertar);
    };
  }, [espiando, fechar]);

  function aoEntrar(e: React.PointerEvent) {
    if (e.pointerType !== "mouse" || !temHover()) return;
    cancelarFechamento();
    if (solta) abrir();
  }
  function aoSair(e: React.PointerEvent) {
    if (e.pointerType !== "mouse" || !espiando) return;
    fecharDaquiAPouco();
  }

  function aoClicar() {
    if (!temHover()) {
      // Toque: sem fixar, o ícone só abre e fecha a espiada.
      if (espiando) fechar();
      else abrir();
      return;
    }
    const atual = solta;
    setSolta(!atual);
    fechar();
    startTransition(() => toggleSidebar(atual));
  }

  // Rótulos já traduzidos no catálogo do oficial: "expandir" é fixar,
  // "recolher" é soltar. Em toque, o ícone é o de abrir a navegação.
  const rotulo = solta ? t("Expandir sidebar") : t("Recolher sidebar");

  return (
    // `contents`: a lâmina fixada continua filha direta da coluna que o AppShell
    // estica na altura da página — é o que mantém o `sticky` dela funcionando.
    <div
      className="contents"
      data-barra-lateral={solta ? "solta" : "fixada"}
      data-espiando={espiando || undefined}
    >
      <button
        ref={icone}
        type="button"
        className="ds-icone-barra"
        aria-label={rotulo}
        title={rotulo}
        aria-pressed={!solta}
        aria-expanded={solta ? espiando : undefined}
        onClick={aoClicar}
        onPointerEnter={aoEntrar}
        onPointerLeave={aoSair}
      >
        <SidebarSimple size={20} aria-hidden />
      </button>

      {/* FIXADA — a mesma lâmina de antes (classes de `Sidebar.tsx`), sem o
          botão de recolher, que o ícone substitui. */}
      {!solta && (
        <aside className="ds-barra-fixada ds-barra-lateral sticky top-0 z-30 flex h-dvh w-60 shrink-0 flex-col border-r">
          <SidebarContent collapsed={false} showCollapseControl={false} />
        </aside>
      )}

      {/* ESPIADA — fica montada e só desliza: `inert` tira do teclado e do
          leitor de tela enquanto está fora. */}
      <div
        ref={espiada}
        className="ds-espiada ds-barra-lateral flex w-60 flex-col border-r"
        data-aberta={espiando || undefined}
        inert={!espiando}
        onPointerEnter={aoEntrar}
        onPointerLeave={aoSair}
      >
        {jaAbriu && (
          <SidebarContent collapsed={false} showCollapseControl={false} onNavigate={fechar} />
        )}
      </div>
    </div>
  );
}
