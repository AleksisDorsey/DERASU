"use client";
import { useTransition } from "react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth, useUser } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useSystemVersion } from "@/hooks/system/useSystemVersion";
import { ArrowCircleUp, ShieldCheck, SignOut } from "@/lib/ui/icons";

function iniciais(nome: string | null, email: string): string {
  if (nome && nome.trim()) {
    return nome
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

/**
 * Derasu — a CONTA, no pé da barra lateral do desktop (ADR 0005).
 *
 * O botão mostra avatar, nome e e-mail e abre o menu PARA CIMA. O menu reúne o
 * que estava espalhado: a versão (antes embaixo de Configurações), o Modo
 * administrador (o mesmo item do `UserMenu`, com o mesmo `testid`), a "Nova
 * versão" (só para o dono do servidor, só quando há versão nova — a mesma
 * condição do `VersionFooter`) e Sair.
 *
 * O botão se chama "Menu do usuário", como o do oficial: no desktop o do topo
 * fica escondido, e quem procura pelo nome (as provas e2e, o leitor de tela)
 * acha este.
 *
 * No celular nada disto aparece: o topo segue com o `UserMenu` de sempre.
 */
export function ContaDaBarra() {
  const t = useT();
  const user = useUser();
  const { signOut } = useAuth();
  const [saindo, startTransition] = useTransition();
  const { data: versao } = useSystemVersion();

  const atual = versao?.current_version?.replace(/^v/i, "");
  const nova =
    versao?.is_owner && versao.update_available
      ? (versao.latest_version?.replace(/^v/i, "") ?? "")
      : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="ds-conta" aria-label={t("Menu do usuário")}>
          <Avatar className="h-8 w-8 shrink-0">
            {user.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
            <AvatarFallback>{iniciais(user.full_name, user.email)}</AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-col text-left">
            <span className="truncate text-sm font-medium">{user.full_name ?? user.email}</span>
            {user.full_name && (
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            )}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="min-w-[224px]">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.full_name ?? user.email}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            {atual && (
              <span className="mt-1 text-[11px] font-normal text-muted-foreground">
                {t("versão")} {atual}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.is_platform_admin && (
          <DropdownMenuItem asChild>
            <Link href="/admin" data-testid="porta-modo-administrador">
              <ShieldCheck size={16} className="mr-2" aria-hidden />
              <span className="flex flex-col">
                <span>{t("Modo administrador")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("Configurar este servidor")}
                </span>
              </span>
            </Link>
          </DropdownMenuItem>
        )}
        {nova !== null && (
          <DropdownMenuItem asChild>
            <Link href="/app/settings/atualizacao">
              <ArrowCircleUp size={16} className="mr-2" aria-hidden />
              <span>
                {t("Nova versão")}
                {nova ? ` · ${nova}` : ""}
              </span>
            </Link>
          </DropdownMenuItem>
        )}
        {(user.is_platform_admin || nova !== null) && <DropdownMenuSeparator />}
        <DropdownMenuItem
          disabled={saindo}
          onClick={() =>
            startTransition(async () => {
              await signOut();
            })
          }
        >
          <SignOut size={16} className="mr-2" aria-hidden />
          {t("Sair")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
