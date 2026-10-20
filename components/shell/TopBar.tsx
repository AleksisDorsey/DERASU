"use client";
import { AlertsBell } from "./AlertsBell";
import { AvisoDePropostaEmDestaque } from "./AvisoDePropostaEmDestaque";
import { MobileSidebar } from "./MobileSidebar";
import { TenantSwitcher } from "./TenantSwitcher";
import { UserMenu } from "./UserMenu";
import { SearchTrigger } from "./SearchTrigger";

export function TopBar() {
  return (
    // Derasu: topo sem faixa — sem fundo nem linha; os controles são cápsulas
    // de vidro e o conteúdo rola por baixo com efeito de borda (`ds-topo`,
    // `ds-capsula`, `ds-capsulas-soltas` em app/globals.css, seção 4).
    <header className="ds-topo sticky top-0 z-20 flex h-14 items-center justify-between gap-2 px-3 md:gap-4 md:px-6">
      <div className="ds-capsulas-soltas flex min-w-0 items-center gap-2">
        <MobileSidebar />
        <TenantSwitcher />
      </div>
      <div className="ds-capsulas-soltas flex min-w-0 flex-1 justify-center md:max-w-md">
        <SearchTrigger />
      </div>
      <div className="ds-capsula flex shrink-0 items-center gap-2">
        <AlertsBell />
        <AvisoDePropostaEmDestaque />
        <UserMenu />
      </div>
    </header>
  );
}
