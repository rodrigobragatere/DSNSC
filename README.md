# Dê o Start na sua Carreira — Unifeso

Jogo arcade estilo plataforma (Mario-like) em **HTML Canvas + CSS + JavaScript**, no tema do Vestibular Unifeso 2027.

Produção: https://destart.vercel.app

---

## Rodar localmente (testes)

### Pré-requisitos

- **Node.js** (para `npx`)
- **Docker Desktop** ligado (só se for testar cadastro no Supabase local)
- **Python 3** (opcional, para servir HTTP na rede / celular)

### 1) Abrir o projeto

```bash
cd caminho/para/DSNSC
```

### 2) Servir os arquivos (recomendado)

Não abra só pelo `file://` se for testar cadastro/API — use um servidor HTTP:

```bash
# Opção A — Python
python -m http.server 8080 --bind 0.0.0.0
```

```powershell
# Opção B — script (mostra o IP do PC para o celular)
powershell -ExecutionPolicy Bypass -File .\serve-mobile.ps1
```

Depois abra:

| Onde | URL |
|------|-----|
| **PC** | http://127.0.0.1:8080 |
| **Celular (mesma Wi‑Fi)** | http://IP_DO_PC:8080 |

### 3) Banco local (opcional — cadastros)

Para gravar leads no Docker/Supabase:

```bash
npx supabase start
```

| Recurso | URL |
|---------|-----|
| API | http://127.0.0.1:54321 |
| Studio (tabela `cadastros`) | http://127.0.0.1:54323 |
| Config | `js/supabase-config.js` |
| Schema | `supabase/schema.sql` |

Aplicar schema (se necessário):

```bash
npx supabase db reset
```

Parar:

```bash
npx supabase stop
```

> Sem Docker: o jogo roda igual; o cadastro fica no `localStorage` do navegador (`dsnsc_leads`).

### 4) Checklist rápido de teste

1. Abra http://127.0.0.1:8080  
2. Preencha nome, e-mail, telefone, **estado (UF)**, **cidade** e curso  
3. Escolha herói + tom de pele + tema  
4. Clique **START — JOGAR**  
5. Confirme:
   - **E-mail novo** → grava no banco (ou localStorage) e inicia  
   - **E-mail já usado** → **não bloqueia**; joga sem duplicar o registro  
6. Admin: botão **ADMIN** → usuário `destart` / senha `destart` → `admin.html`  
7. Celular: aparelho **deitado**; controles no canvas (analógico + PULO / TIRO)

### Controles (teste no PC)

| Tecla | Ação |
|-------|------|
| ← → / A D | Andar |
| Espaço / ↑ / W | Pular (×2 no ar) |
| Z | Atacar |
| P / Esc | Pausar |
| digitar `god` | Liga/desliga god permanente (cheat) |

Blocos `?`: bater de baixo ou atirar → cai **escudo GOD 5s**.

---

## Como jogar (resumo)

1. Preencha o formulário completo  
2. Escolha o tema:
   - **Saúde** · **Humanas e Sociais** · **Exatas** · **EaD**  
3. **START** — fase ~1 min + boss + bandeira Unifeso (**50% bolsa**)

### Mobile

- Jogue em **paisagem**  
- Controles touch **dentro do canvas** (sem barra de botões HTML)  
- Logo: `assets/unifeso-logo.png`

### Áudio

- `assets/audio/de-o-start.mp3`  
- ON/OFF + volume (salvo no `localStorage`)

---

## Admin (cadastros)

1. Tela inicial → **ADMIN**  
2. Login: `destart` / `destart`  
3. Grid com filtros (data / curso), CRUD e **Exportar .XLS**

---

## Cadastro

| Ambiente | Onde grava |
|----------|------------|
| **Local + Supabase Docker** | tabela `cadastros` em http://127.0.0.1:54321 |
| **Local sem Docker** | `localStorage` (`dsnsc_leads`) |
| **Produção (Vercel)** | `/api/cadastros` + Blob (`BLOB_READ_WRITE_TOKEN`) |

Regras:

- Campos obrigatórios para iniciar  
- E-mail **único** (não duplica no banco)  
- E-mail repetido **ainda permite jogar**

Deploy produção:

```bash
npx vercel --prod
```

Admin online: https://destart.vercel.app/admin.html

---

## Personagens e conteúdo

### Heróis

| Personagem | Pele |
|------------|------|
| Vestibulando / Vestibulanda | branco · pardo · negro (`assets/sprites/skins/`) |

### Vilões / bosses (por tema)

- **Saúde** — Vírus (boss), Cárie, Ruído, Câncer  
- **Humanas** — Processo, Corrupção (boss), Fissura, Réu Contumaz  
- **Exatas** — Bug, Malware, 404, Stack Overflow (boss)  
- **EaD** — Procrastinação, Wi‑Fi Caiu, Prazo (boss), Distração  

Sprites em `assets/enemies/`.

### Obstáculos / itens

| Item | Efeito |
|------|--------|
| Fossos / espinhos | Dano |
| Blocos `?` | Escudo GOD 5s |
| **Diplomas** | Coletável (`assets/items/diploma.png`) · tiro (`assets/items/tiro.png`) |
| Boss + bandeira | Vitória + splash 50% bolsa |

---

## Estrutura

```
index.html              → tela inicial + jogo
admin.html              → painel de cadastros
serve-mobile.ps1        → HTTP na rede local
api/cadastros.js        → API produção (Vercel + Blob)
js/app.js               → formulário, áudio, admin
js/game.js              → engine
js/themes.js            → temas / vilões / bosses
js/leads.js             → cadastros (API / Supabase / local)
js/admin.js             → grid admin
js/supabase-config.js   → URL local / cloud
assets/items/diploma.png
assets/enemies/
assets/obstacles/
supabase/               → schema + migrations
```
