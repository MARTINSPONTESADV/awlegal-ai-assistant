# CLAUDE.md — AW Legaltech ERP

## Contexto do Projeto

Sistema ERP jurídico para o escritório **Martins Pontes Advocacia**.
Inclui gestão de processos, clientes, atendimento WhatsApp, CRM, financeiro e marketing.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Recharts
- **Backend:** Supabase (2 projetos separados)
- **Automação:** n8n em `n8n.awlegaltech.com.br`
- **Deploy:** Vercel (auto-deploy no push para `main`)
- **Package manager:** bun (`bun install`, `bun run dev`)

## Dois Projetos Supabase

| Projeto | ID | Tabelas (principais) |
|---------|-----|----------------------|
| ERP Principal | `occoggvuaevikpuqnmge` | processos, clientes, agenda, honorarios, profiles, **controle_bot**, **historico_mensagens**, controle_atendimento, historico_funil, publicacoes, templates, mensagens_rapidas |
| Bot/CRM | `bxmlxogitvdumkjewfug` | followup_clientes, documents, meta_ads_insights, movimentacoes |

⚠️ Correção importante (2026-04-18): `controle_bot`, `historico_mensagens`, `historico_funil` e `controle_atendimento` estão no **ERP** (`occoggvuaevikpuqnmge`), NÃO no Bot/CRM. Uma doc antiga afirmava o contrário — ignorar.

- ERP client: `src/integrations/supabase/client.ts` → `supabase`
- Bot/CRM client: `src/integrations/supabase/clientMarketing.ts` → `supabaseMarketing`

## Regras Obrigatórias

1. **DB:** Sempre usar `supabase/migrations/` — nunca SQL manual
2. **n8n:** Sempre confirmar com o usuário antes de PUT em qualquer workflow
3. **Testes:** Rodar `npm test` após qualquer alteração de código e reportar resultado
4. **Commits:** Português, prefixo convencional (feat, fix, refactor, etc.)
5. **Push:** Nunca fazer push sem pedir permissão ao usuário
6. **Validação visual:** Gerar prompt de validação ao final de toda alteração de UI

## Conhecimento Acumulado — Consultar Sempre

Antes de trabalhar em qualquer área, verificar o vault Obsidian em:
`C:\Users\winic\OneDrive\Desktop\AW-Brain\`

Vault reestruturado em 27/03/2026 — nova estrutura:
- `00 - AW LEGALTECH/` — empresa mãe (infra, conhecimento técnico)
- `01 - MP Martins Pontes/` — operação MP
- `02 - ME Matheus Enes/` — operação ME
- `07 - Claude/` — contexto e credenciais

### Por área (operação MP):

| Área | Arquivo do Vault |
|------|-----------------|
| Atendimento/Chat | `01 - MP Martins Pontes/Bot e Atendimento/Chat Logic.md` |
| Canal Resolva Já | `01 - MP Martins Pontes/Bot e Atendimento/Canal Resolva Ja.md` |
| Canal MP direto | `01 - MP Martins Pontes/Bot e Atendimento/Canal MP.md` |
| CRM / Funil | `01 - MP Martins Pontes/CRM/Funil de Vendas.md` |
| Financeiro | `01 - MP Martins Pontes/Financeiro/Logica Financeira.md` |
| Marketing | `01 - MP Martins Pontes/Marketing/Dashboard Marketing.md` |
| n8n Workflows | `01 - MP Martins Pontes/Integracoes/n8n Workflows MP.md` |
| Supabase ERP | `01 - MP Martins Pontes/Sistema ERP/Schema ERP.md` |
| Supabase Bot/CRM | `01 - MP Martins Pontes/Sistema ERP/Schema Bot CRM.md` |
| Bugs resolvidos | `01 - MP Martins Pontes/Logs/Bugs Resolvidos.md` |
| Estado atual | `01 - MP Martins Pontes/Estado Atual MP.md` |
| Decisões | `01 - MP Martins Pontes/Logs/Log de Decisoes.md` |
| Roadmap | `01 - MP Martins Pontes/Roadmap MP.md` |
| Meta Ads MP | `01 - MP Martins Pontes/Marketing/Meta Ads MP.md` |
| Evolution API | `00 - AW LEGALTECH/Infraestrutura Compartilhada/Evolution API - Instancias.md` |
| Generator docs | `01 - MP Martins Pontes/Financeiro/Generator de Documentos.md` |
| Edge Functions | `01 - MP Martins Pontes/Sistema ERP/Edge Functions.md` |
| Dashboard KPIs | `01 - MP Martins Pontes/Sistema ERP/Dashboard KPIs.md` |
| Migrations | `01 - MP Martins Pontes/Sistema ERP/Migrations Log.md` |

## Arquivos-Chave do Código

```
src/
├── pages/
│   ├── Atendimento.tsx      ← chat WhatsApp (mais complexo)
│   ├── CRM.tsx              ← funil de vendas
│   ├── Financeiro.tsx       ← financeiro + marketing
│   ├── Dashboard.tsx        ← visão geral
│   └── Generator.tsx        ← gerador de DOCX/PDF
├── components/
│   ├── marketing/           ← MarketingTab + sub-componentes
│   └── atendimento/         ← ChatMediaRenderer, AudioRecorder, etc.
├── hooks/
│   ├── useMarketingData.ts  ← dados marketing (3 fontes)
│   └── useTotalCausa.ts     ← total de causa dos processos
└── lib/
    └── financeiro.ts        ← fmtBRL, calcEscritorio, calcRepasse
```

## Pitfalls Conhecidos

- `controle_bot` no Bot/CRM usa `supabaseMarketing`, não `supabase`
- `meta_ads_insights` idem — Bot/CRM project
- Leads no marketing = contagem do `controle_bot` (não Meta API — campanhas são de tráfego)
- Timezone do app: `America/Manaus` (UTC-4) — usar `date-fns-tz`
- JIDs WhatsApp: sempre normalizar com `normalizeWaId()` antes de comparar números
- Imagens no chat: nunca usar `loading="lazy"` em elementos com `hidden`/`display:none`
- `historico_funil` existe no Bot/CRM para log de transições de estágio
