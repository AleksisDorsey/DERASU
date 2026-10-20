# Derasu — instruções da fork

> Carregado pelo `CLAUDE.md` da raiz (última linha, `@derasu/CLAUDE.md`). **Acrescenta, não
> revoga:** toda a doutrina do `CLAUDE.md` oficial continua valendo. Onde este arquivo fala de
> algo que a doutrina não cobre (a fork, a VPS do Derasu, a direção de design), ele manda.

Responda sempre em **português**.

## O que é

**Derasu** é a fork pessoal do DeskcommCRM com uma interface própria, inspirada no design da
Apple (Liquid Glass, Human Interface Guidelines): materiais translúcidos com hierarquia,
profundidade, movimento com física e legibilidade antes de tudo. O objetivo é avançar muito
na interface — telas, botões, animações — **sem quebrar nada do que já funciona** e
**sem dificultar receber as atualizações do oficial**.

No código e nos commits o produto continua se chamando Deskcomm; "Derasu" nomeia a fork, a
camada visual e a instalação.

**A fork contradiz de propósito o design system do oficial** (vidro, gradiente de luz, paleta,
fonte): ver [ADR 0001](docs/adr/0001-liquid-glass-revoga-anti-padroes.md) antes de "consertar"
qualquer coisa por `docs/design-system/09-anti-patterns.md`. **Vidro só na camada de controle;
conteúdo é superfície** ([ADR 0002](docs/adr/0002-vidro-so-na-camada-de-controle.md)).
**Movimento só em CSS** ([ADR 0003](docs/adr/0003-movimento-so-em-css.md)).

## Repositórios e branches

| Remote | Repo | Papel |
|---|---|---|
| `origin` | `AleksisDorsey/DERASU` | a fork — onde tudo é commitado |
| `upstream` | `melgarafael/DeskcommCRM` | o oficial — só leitura, só se puxa dele |

- **PR vai para a fork, nunca para o oficial.** `gh pr create` num fork aponta para o repo pai
  por padrão: passe sempre `--repo AleksisDorsey/DERASU --base main`.
- **Push na `main` da fork publica imagem.** O `publish-image.yml` gera
  `ghcr.io/aleksisdorsey/{deskcommcrm,deskcomm-worker,deskcomm-scheduler}:main`. A `main` da
  fork é, portanto, o que pode ir para produção. Trabalho em branch `feat/derasu-*` /
  `fix/derasu-*` e PR.
- **Atualizar com o oficial:** `git fetch upstream && git merge upstream/main` numa branch
  própria, PR para a `main` da fork. Nunca rebase nem force-push na `main`. Para saber o
  atraso: `git rev-list --count main..upstream/main`.

## Regra de ouro: superfície mínima de conflito

Cada arquivo do oficial que a fork altera vira conflito potencial em toda atualização.

1. **Prefira CSS a JSX.** A camada visual mora em `app/globals.css`, na seção
   "PROFUNDIDADE E VIDRO", com classes `ds-*` (`ds-cartao`, `ds-painel`, `ds-barra-lateral`,
   `ds-botao-primario`, `ds-botao-vidro`, `ds-botao-perigo`). Mudar o visual por ali e por
   tokens alcança o app inteiro tocando um arquivo só.
2. **Depois, os primitivos** de `components/ui/` (shadcn). Mexer numa tela específica
   (`app/**`, `components/<área>/**`) é o último recurso e precisa de motivo escrito no PR.
3. **Arquivo novo é melhor que arquivo alterado.** Componente, hook ou CSS exclusivo do Derasu
   pode nascer em caminho próprio e ser importado de um ponto só.
4. **Não edite o `CLAUDE.md` nem o `AGENTS.md` oficiais** além da linha de import. Regra nova
   da fork vem para este arquivo.

## Vocabulário e decisões (grill-with-docs)

O repo segue o layout multi-contexto das skills `grill-with-docs` / `domain-modeling`: o
`GLOSSARY-MAP.md` da raiz aponta os contextos, e o do Derasu mora aqui.

- **`derasu/GLOSSARY.md`** — o glossário de design do Derasu: o que é "vidro", "material",
  "elevação", "superfície", "halo", que tipo de movimento é cada animação. Use exatamente esses
  nomes no código e na conversa. Se ele não existir, crie-o quando o primeiro termo for fixado.
- **`derasu/docs/adr/NNNN-titulo.md`** — decisões de design da fork. **Não use `docs/adr/`**: é
  a pasta do oficial, e a numeração colidiria com os ADRs que vierem de lá.
- **Não rode `/setup-matt-pocock-skills` neste repo**: ele escreve uma seção no `CLAUDE.md`
  oficial e cria `docs/agents/`. O `grill-with-docs` não precisa dele.

## O que não pode quebrar

São gates, não sugestões (o primeiro já reprovou o e2e numa mudança de tema da fork):

- **`<Card>` mantém a classe `border-border`.** As provas e2e localizam o card do design system
  por ela (`tests/e2e/automacao-diz-a-verdade.spec.ts` e irmãos). A borda translúcida entra por
  `.ds-cartao.border-border`.
- **Contraste.** `lib/branding/regua-do-produto.ts`, vigiado por
  `tests/unit/branding-contraste.test.ts` e `tests/unit/branding-pares-pintados.test.ts`.
  Translucidez nunca pode custar leitura.
- **Tokens do Tailwind 4** (CSS-first, sem `tailwind.config.ts`), vigiados por
  `tests/unit/tailwind-tokens.test.ts`.
- **Marca própria.** A cor de destaque vem do banco (`platform_branding`), não de constante:
  o design tem que ficar bom com **qualquer** accent, não só com o azul do Derasu.
- **Claro e escuro.** Todo material novo existe nos dois (`[data-theme="dark"]`).
- **Movimento acessível.** Toda animação respeita `prefers-reduced-motion`. Desfoque
  (`backdrop-filter`) tem fallback legível sem ele.

Antes de dizer "pronto" numa mudança visual: `pnpm typecheck`, `pnpm lint`, os testes acima e
a prova pela tela da doutrina (screenshots claro/escuro, desktop/celular, em
`evidence/derasu-<entrega>/`, medidas via Playwright e nunca a olho).

## Desenvolvimento local (Windows)

Este clone (`Desktop\Projeto Nova Interface`) é onde se desenvolve e se vê a interface. Node,
pnpm e Docker estão instalados; o caminho de "Como rodar local" do `CLAUDE.md` oficial foi
escrito para Ubuntu. O que funcionar ou exigir ajuste no Windows fica registrado aqui.

- **Não edite os scripts de `scripts/`** para fazê-los funcionar no Windows (conflito a cada
  atualização). Ajuste de Windows mora em `derasu/scripts/`.
- Caminho escolhido: Supabase local no Docker Desktop (CLI fixado na versão do CI, pg15,
  `baseline.sql` + `bootstrap-owner.ts`) e o app rodando **direto no Windows** (`pnpm dev`; para
  prova de tela, `next build` + `next start`). App fora de contêiner é o que faz `127.0.0.1`
  funcionar — o `pnpm local:up` grava `127.0.0.1` no `.env.local`, que dentro do contêiner aponta
  para ele mesmo. WAHA e Redis ficam de fora do trabalho visual.
- Node 22 via `fnm` (lê o `.nvmrc`), igual ao CI.
- Git Bash converte caminhos POSIX em argumentos de `docker run -v`/`psql -f`: use
  `MSYS_NO_PATHCONV=1`.
- `/design` (vitrine do design system) exige login: não está em `lib/auth/public-paths.ts`,
  embora o `app/design/README.md` diga que é pública.

## Produção: cereme.derasu.com.br

**É produção com dados e operação reais.** Nada é testado lá primeiro.

- Acesso: `ssh -i C:\Users\Usuario\Downloads\ssh-key-2026-09-04.key ubuntu@163.176.184.217`
  (Oracle, ARM64). A instalação fica em `~/DeskcommCRM`, um clone do **oficial** usado só pelo
  kit de instalação — não se desenvolve nele.
- **Só leitura sem pedir** (`docker ps`, logs, `git status`, ler o `.env` sem copiar segredos para a conversa).
  Qualquer coisa que muda a VPS — editar `.env`, `docker compose up`, `update.sh`, migration —
  só com o "sim" do usuário **naquela sessão**.
- **Pôr a versão Derasu no ar:** trocar `APP_IMAGE` / `WORKER_IMAGE` / `SCHEDULER_IMAGE` no
  `.env` para as imagens `ghcr.io/aleksisdorsey/...:main` e subir de novo.
- **Voltar ao oficial:** `bash hostgator-setup-kit/update.sh` (regrava as imagens oficiais).
- Depois de qualquer troca: `/` responde **200** e `/app` responde **307** (ver "Deploy em
  produção" no `CLAUDE.md` oficial).
