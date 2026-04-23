# Onboarding de novo advogado (tenant)

Guia passo-a-passo pra colocar um novo escritório rodando em AW ECO ou AW SYSTEM.

## Pré-requisitos

- Conta Supabase (supabase.com) — criar projeto novo
- Conta Vercel (vercel.com) — importar repo + configurar env vars
- Domínio próprio (opcional, ex: `adv2.aweco.com.br`)

## Passo 1 — Criar Supabase

1. https://supabase.com/dashboard → **New project**
2. Nome: `aw-eco-<nome-adv>` ou similar
3. Region: `South America (São Paulo)` se cliente BR
4. Anota:
   - `Project URL` (ex: `https://abc123.supabase.co`)
   - `anon public key` (settings → API)

## Passo 2 — Aplicar migrations (schema)

```bash
# No terminal, dentro do repo local AW-ECO ou AWSYSTEM
npm i -g supabase
supabase login
supabase link --project-ref <project-ref-do-passo-1>
supabase db push
```

Isso aplica todas as ~55 migrations e cria o schema completo.

## Passo 3 — Criar primeiro usuário admin

No Supabase Dashboard do tenant:
1. **Authentication → Users → Invite user** → coloca o email do advogado
2. Advogado recebe link por email, define senha
3. Pega o `user.id` (UUID) dele
4. No **SQL Editor** do Supabase:
```sql
INSERT INTO user_roles (user_id, role) VALUES ('<uuid-do-user>', 'admin');
```

## Passo 4 — Criar projeto Vercel

1. https://vercel.com/new → **Import Git Repository**
2. Seleciona `AWLEGALTECH/AW-ECO` (ecossistema) ou `AWLEGALTECH/AWSYSTEM` (só hub)
3. **Nome do projeto**: `aw-eco-<nome-adv>` ou similar
4. **Framework Preset**: Vite (auto-detect)
5. **Root Directory**: `./` (default)
6. **Build command**: `npm run build` (default)
7. **Output directory**: `dist` (default)
8. **Environment Variables**: adiciona as vars do passo 5 antes de Deploy

## Passo 5 — Environment Variables no Vercel

Copia do `.env.example` do repo e preenche:

```bash
# Supabase (obrigatório)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>

# Marketing (opcional — se quiser aba Marketing)
VITE_MARKETING_SUPABASE_URL=<outro-projeto-supabase-opcional>
VITE_MARKETING_SUPABASE_KEY=<anon-key-dele>

# n8n (opcional — se usar atendimento WhatsApp)
VITE_N8N_BASE_URL=https://n8n.seudominio.com.br

# Branding do tenant
VITE_APP_NAME=Silva Advogados        # ou "AW ECO" se padrão
VITE_APP_TAGLINE=Gestão Jurídica
VITE_OFFICE_NAME=Silva Advogados
VITE_COPYRIGHT_YEAR=2026

# Features (AW-ECO)
# Valores válidos: system, crm, pre, fin
# Default: todos. Exemplos:
#   VITE_FEATURES=system,fin              → só hub + financeiro
#   VITE_FEATURES=system,crm              → sem pré-protocolo nem financeiro
#   VITE_FEATURES=system,crm,pre,fin      → completo (default)
VITE_FEATURES=system,crm,pre,fin

# Features (AW-SYSTEM)
# Valores válidos: system, crm, fin
```

Clica **Deploy**.

## Passo 6 — Custom domain (opcional)

No Vercel → Settings → Domains → Add `<nome>.aweco.com.br` (ou domínio do advogado).
Configurar DNS conforme instruções do Vercel.

## Passo 7 — Smoke test

Acessa o deploy do advogado:
1. Login com o admin criado no passo 3
2. Verifica se carrega `/` (vai redirect pra `/home` no AW-ECO ou `/dashboard` no AWSYSTEM)
3. Checa o branding (nome do escritório aparece?)
4. Cria 1 cliente de teste
5. Cria 1 processo de teste
6. Se deu tudo certo, apaga os testes e entrega pro adv

## Como atualizar

Cada adv tem seu próprio deploy Vercel. Quando fizemos um push no repo:

- **MP**: Vercel Projeto 1 (aw-eco-mp) rebuilda automaticamente
- **Silva**: Vercel Projeto 2 (aw-eco-silva) rebuilda automaticamente
- Ambos ficam na versão mais nova do código, com seus próprios dados

Não tem nada diferente — 1 push = todos atualizados.

## Troubleshooting

### "Supabase env ausente"
`.env` ou Vercel env vars não tem `VITE_SUPABASE_URL`. Verifique o passo 5.

### Login funciona mas vê tela em branco
Faltou rodar migrations (passo 2) ou adicionar role admin (passo 3).

### Feature desabilitada ainda aparece no sidebar
Verifique `VITE_FEATURES` — valores separados por vírgula sem espaço: `system,crm,fin`.

### Advogado quer customizar logo
Host o logo (SVG preferido) em algum CDN/Cloudinary/Supabase Storage, aponta `VITE_LOGO_URL`.

### Mudanças no código MP não chegam aos outros advs
Confirma que cada adv tem Vercel Project apontando pro mesmo repo.
Cada push no repo dispara rebuild de todos os projects Vercel linkados.
