import * as React from "react";

import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // `ds-cartao` traz o material SUPERFÍCIE — fundo opaco, aresta e
      // elevação (ver "LIQUID GLASS" em app/globals.css; o cartão é conteúdo,
      // e conteúdo não é vidro: derasu/docs/adr/0002). Ele mora em
      // `@layer components`, então um `bg-*`/`shadow-*` passado aqui continua
      // vencendo; por isso `bg-surface`/`shadow-xs` não estão nesta lista.
      //
      // `border-border` FICA, e não por estética: as provas de tela localizam
      // "o card do design system" por essa classe (xpath em
      // tests/e2e/automacao-diz-a-verdade.spec.ts e irmãos). Tirá-la reprovou
      // 4 das 6 partes do e2e. O contorno da superfície entra por
      // `.ds-cartao.border-border` em `@layer utilities`.
      "ds-cartao rounded-lg border border-border text-text",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-2 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-base font-semibold leading-tight tracking-tight text-text",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-relaxed text-text-muted", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
