import { ViewTransition } from "react";

/**
 * Derasu — entrada de rota da área do tenant.
 *
 * O Next remonta este template quando muda a área (o primeiro segmento depois
 * de `/app`), e a navegação do App Router já é uma transição do React: o
 * `<ViewTransition>` sai com a página velha e entra com a nova, e o navegador
 * anima as duas pela View Transitions API. As curvas moram em
 * `app/globals.css` ("LIQUID GLASS", 4d), nas classes `ds-rota-sai` e
 * `ds-rota-entra`.
 *
 * Não há `<div>` aqui, de propósito: o `<ViewTransition>` não cria elemento,
 * então a página continua filha direta do `<main>` da casca e o `h-full` da
 * raiz das páginas segue resolvendo contra ele.
 *
 * `default="none"`: atualizações dentro da mesma área (`router.refresh()`,
 * trocar de conversa na inbox, revelar o conteúdo depois do esqueleto) não
 * animam a página inteira.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="ds-rota-entra" exit="ds-rota-sai" default="none">
      {children}
    </ViewTransition>
  );
}
