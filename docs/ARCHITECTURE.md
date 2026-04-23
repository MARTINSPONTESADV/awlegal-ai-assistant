# AW ECO — Arquitetura do Ecossistema

## Visão geral

AW ECO é um ecossistema modular de sistemas jurídicos, dividido em 4 repositórios separados:

```
┌─────────────────────────────────────────────────────────────────┐
│  AWLEGALTECH/AW-ECO (ecossistema premium - ESTE repo)           │
│  ├─ Hub Jurídico (base do AW SYSTEM)                            │
│  ├─ AW CRM (parte do SYSTEM)                                    │
│  ├─ AW FIN (parte do SYSTEM)                                    │
│  ├─ AW FINDER (integrado via src/apps/finder/)                  │
│  ├─ AW WRITER (integrado via public/apps/writer/)               │
│  └─ HomeHub + PreProtocolo + sidebar com 4 cubos                │
│  → Deploy Vercel (produção principal)                            │
└─────────────────────────────────────────────────────────────────┘
         ⇅ sync bidirecional
┌─────────────────────────────────────────────────────────────────┐
│  AWLEGALTECH/AWSYSTEM (hub jurídico standalone)                 │
│  ├─ Clientes, Processos, Agenda, etc.                          │
│  ├─ AW CRM (Atendimento + Funil)                               │
│  └─ AW FIN (Financeiro + Gastos + Marketing)                   │
│  → Base code sync com AW-ECO (sem pré-protocolo)                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐  ┌─────────────────────────┐
│  AWLEGALTECH/AW-FINDER  │  │  AWLEGALTECH/AW-WRITER  │
│  Auditor bancário       │  │  Confecção de iniciais  │
│  → aw-finder.vercel.app │  │  → aw-writer.vercel.app │
└─────────────────────────┘  └─────────────────────────┘
```

## Regras de sincronização

### 1. Frontend muda num repo → propagar para os outros

Se você mexer em código compartilhado, a mudança deve chegar em todos os repos onde esse código existe.

| Local da mudança | Propagar para |
|---|---|
| `AW-ECO/src/apps/finder/*` | `AW-FINDER/src/*` (mesmo código) |
| `AW-FINDER/src/*` | `AW-ECO/src/apps/finder/*` |
| `AW-ECO/public/apps/writer/index.html` | `AW-WRITER/index.html` |
| `AW-WRITER/index.html` | `AW-ECO/public/apps/writer/index.html` |
| `AW-ECO/src/pages/Clientes.tsx` (base) | `AWSYSTEM/src/pages/Clientes.tsx` |
| `AWSYSTEM/src/pages/Clientes.tsx` (base) | `AW-ECO/src/pages/Clientes.tsx` |

**Não propagar** (específicos do AW-ECO):
- `AW-ECO/src/pages/HomeHub.tsx` — só existe no ecossistema
- `AW-ECO/src/pages/PreProtocolo.tsx` — só existe no ecossistema
- `AW-ECO/src/pages/apps/Writer.tsx` + `Finder.tsx` — wrappers do ecossistema
- Rotas `/home` e `/pre-protocolo` no App.tsx — só no ecossistema

### 2. Banco de dados é isolado por tenant

**Mudar código** → afeta todos os deploys daquele repo.
**Mudar banco** → afeta só aquele tenant (aquele Supabase específico).

Cada advogado que usar AW ECO ou AW SYSTEM tem seu próprio Supabase, suas próprias credenciais no `.env` do Vercel. Código é compartilhado, dados não.

## Scripts de sincronização

Todos os scripts estão em `scripts/sync/` no repo AW-ECO.

### `npm run sync:finder:pull`
Puxa mudanças do `AWLEGALTECH/AW-FINDER` pra `src/apps/finder/` neste repo (AW-ECO).

Quando usar: se alguém commitou no AW-FINDER standalone e você quer trazer pra cá.

### `npm run sync:finder:push`
Empurra mudanças do `src/apps/finder/` pra `AWLEGALTECH/AW-FINDER`.

Quando usar: se você mexeu no finder DENTRO do AW-ECO e quer que a versão standalone (aw-finder.vercel.app) também receba.

### `npm run sync:writer:pull` / `sync:writer:push`
Mesma lógica pro AW WRITER (que é 1 arquivo HTML).

### `npm run sync:system:pull` / `sync:system:push`
Sincroniza código base (páginas, components, hooks, etc.) com `AWLEGALTECH/AWSYSTEM`.
Exclui arquivos específicos do AW-ECO (HomeHub, PreProtocolo, etc.).

## Como configurar um advogado novo (multi-tenant)

Todos os repos suportam multi-tenant via env vars. Para cada advogado:

1. **Supabase novo**: criar projeto, rodar migrations
2. **Vercel novo projeto** apontando pro repo apropriado:
   - Ecossistema completo → `AWLEGALTECH/AW-ECO`
   - Só hub jurídico → `AWLEGALTECH/AWSYSTEM`
3. **Env vars no Vercel** (ver `.env.example` do repo)
4. **Deploy** automático no próximo push

Não precisa criar repo novo. O mesmo código-fonte serve todos.

Ver `docs/ONBOARDING-TENANT.md` para passo a passo detalhado.

## Workflow de desenvolvimento

### Cenário 1: Bug fix no código base (Clientes, Processos, etc.)
1. Corrigir no AW-ECO
2. Push AW-ECO → deploy automático em produção
3. Rodar `npm run sync:system:push` → AWSYSTEM recebe
4. (Se algum adv usa AWSYSTEM standalone) Deploy automático dele

### Cenário 2: Feature nova no AW FINDER
1. Opção A: mexer em `AW-ECO/src/apps/finder/` + `npm run sync:finder:push`
2. Opção B: mexer no repo AW-FINDER direto + `npm run sync:finder:pull` no AW-ECO
3. Ambos deploys atualizam

### Cenário 3: Feature específica do ecossistema (HomeHub, PreProtocolo)
1. Mexer só no AW-ECO
2. Push → deploy
3. **Não sincronizar** pra AWSYSTEM (esses arquivos não existem lá)

## Repo de referência

- Produção principal: deploy do AW-ECO (Vercel do MP + futuros advs)
- MARTINSPONTESADV/awlegal-ai-assistant: **deprecated** — use AW-ECO
- Sincronização: manual via scripts (automação futura com GitHub Actions)
