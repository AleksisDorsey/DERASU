"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { toggleSidebar } from "@/app/actions/shell/toggleSidebar";
import { SidebarContent } from "@/components/shell/Sidebar";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { GRUPO_NO_RODAPE, sidebarGroups } from "@/lib/navigation/registry";
import { Gear } from "@/lib/ui/icons";
// Direto do pacote, e não do barril `lib/ui/icons.ts`: acrescentar o ícone lá
// seria mexer num arquivo do oficial por um nome só. Mesma variante (`ssr`).
import { SidebarSimple } from "@phosphor-icons/react/dist/ssr";

import { ContaDaBarra } from "./ContaDaBarra";
import { EVENTO_DOS_LUGARES } from "./NoLugar";

/**
 * Derasu — a barra lateral do desktop (ADR 0004 e ADR 0005).
 *
 * - FIXADA: o painel ocupa o próprio lugar ao lado do conteúdo.
 * - SOLTA: o painel sai da tela, e a ESPIADA o mostra por cima do conteúdo
 *   enquanto o mouse está no ícone da barra ou nele.
 *
 * Em volta dele, duas peças presas à janela, que existem uma vez só e ficam no
 * mesmo ponto nos dois estados:
 *
 * - a CÁPSULA DO CANTO (alto à esquerda): ícone da barra, Configurações, e os
 *   LUGARES de Notificações e Buscar;
 * - o PÉ DA BARRA (embaixo): os lugares de organização, idioma e tema, e a CONTA.
 *
 * Os "lugares" são onde `NoLugar` desenha, por portal, os controles do oficial
 * que nascem no topo — sem cópia, porque sino, busca e tema têm efeitos (som,
 * atalhos) que duplicariam.
 *
 * Só o clique no ícone fixa e solta. Em tela de toque (sem hover) não existe
 * fixar: o toque no ícone abre e fecha a espiada, e o CSS tira o painel fixado
 * de cena — o critério é o aparelho, não a largura.
 *
 * O estado vem do cookie `sidebar_collapsed` ("1" = solta), lido no servidor
 * para a primeira pintura já sair certa. Medidas e materiais em
 * app/globals.css ("LIQUID GLASS", 4e).
 */

/** Quanto a espiada espera, com o mouse fora, antes de sumir: perdoa a diagonal. */
const ESPERA_PARA_FECHAR_MS = 300;

/** Um menu do Radix aberto (conta, organização, idioma) mora num portal fora da barra. */
const MENU_ABERTO = "[data-radix-popper-content-wrapper]";

function temHover(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}

export function BarraLateral({ solta: soltaDoServidor }: { solta: boolean }) {
  const t = useT();
  const pathname = usePathname();
  const { user, activeOrg } = useAuth();
  const [solta, setSolta] = useState(soltaDoServidor);
  const [espiando, setEspiando] = useState(false);
  // A espiada só monta a navegação na primeira vez que abre. Com a barra
  // fixada e mouse, ela nunca abre — e não deixa uma segunda "Navegação
  // principal" escondida na página.
  const [jaAbriu, setJaAbriu] = useState(false);
  const [, startTransition] = useTransition();
  const fechamento = useRef<ReturnType<typeof setTimeout> | null>(null);
  const icone = useRef<HTMLButtonElement>(null);
  const espiada = useRef<HTMLDivElement>(null);
  const pe = useRef<HTMLDivElement>(null);

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

  // Os lugares existem a partir daqui: os controles do topo podem vir.
  useEffect(() => {
    window.dispatchEvent(new Event(EVENTO_DOS_LUGARES));
  }, []);

  // Configurações: o mesmo destino, com a mesma regra de quem vê, que o rodapé
  // do `SidebarContent` usa.
  const configuracoes = sidebarGroups(
    user.is_platform_admin && !user.support,
    activeOrg?.role ?? null,
    activeOrg?.interface_settings,
    activeOrg?.modulos_ligados ?? [],
    activeOrg?.capacidades_ligadas ?? [],
  ).find((g) => g.group.id === GRUPO_NO_RODAPE)?.group.hub;

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
    const tentar = () => {
      // Com um menu do pé aberto, a espiada fica: sumir levaria o menu junto.
      if (document.querySelector(MENU_ABERTO)) {
        fechamento.current = setTimeout(tentar, ESPERA_PARA_FECHAR_MS);
        return;
      }
      setEspiando(false);
    };
    fechamento.current = setTimeout(tentar, ESPERA_PARA_FECHAR_MS);
  }, [cancelarFechamento]);

  useEffect(() => cancelarFechamento, [cancelarFechamento]);

  // Esc e clique fora fecham.
  useEffect(() => {
    if (!espiando) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape" && !document.querySelector(MENU_ABERTO)) fechar();
    }
    function aoApertar(e: PointerEvent) {
      const alvo = e.target as Element;
      if (
        icone.current?.contains(alvo) ||
        espiada.current?.contains(alvo) ||
        pe.current?.contains(alvo) ||
        alvo.closest?.(MENU_ABERTO)
      )
        return;
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
  /** Entrar na espiada ou no pé só segura a espiada; quem abre é o ícone. */
  function aoEntrarNaBarra(e: React.PointerEvent) {
    if (e.pointerType !== "mouse") return;
    cancelarFechamento();
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
  // "recolher" é soltar.
  const rotulo = solta ? t("Expandir sidebar") : t("Recolher sidebar");
  const emConfiguracoes = configuracoes ? pathname.startsWith(configuracoes.href) : false;

  return (
    // `contents`: o painel fixado continua filho direto da coluna que o
    // AppShell estica na altura da página — é o que mantém o `sticky` dele.
    <div
      className="contents"
      data-barra-lateral={solta ? "solta" : "fixada"}
      data-espiando={espiando || undefined}
    >
      <div className="ds-canto">
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
        {configuracoes && (
          <Link
            href={configuracoes.href}
            className="ds-canto-item"
            aria-label={t(configuracoes.label)}
            title={t(configuracoes.label)}
            aria-current={emConfiguracoes ? "page" : undefined}
          >
            <Gear size={18} aria-hidden />
          </Link>
        )}
        <span id="derasu-lugar-notificacoes" className="ds-lugar" />
        <span id="derasu-lugar-buscar" className="ds-lugar" />
      </div>

      {/* FIXADA — o painel, com a navegação do oficial; o rodapé dele (que
          tinha Configurações e a versão) sai no desktop pelo CSS: as duas
          coisas foram para a cápsula e para a conta. */}
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
        onPointerEnter={aoEntrarNaBarra}
        onPointerLeave={aoSair}
      >
        {jaAbriu && (
          <SidebarContent collapsed={false} showCollapseControl={false} onNavigate={fechar} />
        )}
      </div>

      {/* O PÉ DA BARRA — preso à janela, por cima do fundo do painel (fixada)
          ou da espiada (solta), e deslizando com ela. */}
      <div
        ref={pe}
        className="ds-pe"
        inert={solta && !espiando}
        onPointerEnter={aoEntrarNaBarra}
        onPointerLeave={aoSair}
      >
        <div className="ds-pe-controles">
          <span id="derasu-lugar-organizacao" className="ds-lugar" />
          <span id="derasu-lugar-idioma" className="ds-lugar" />
          <span id="derasu-lugar-tema" className="ds-lugar" />
        </div>
        <ContaDaBarra />
      </div>
    </div>
  );
}
