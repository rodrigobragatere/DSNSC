# Dê o Start na sua Carreira — Unifeso

Jogo arcade estilo plataforma (Mario-like) em **HTML Canvas + CSS + JavaScript**, no tema do Vestibular Unifeso 2027.

## Como jogar

1. Suba o Supabase local (opcional, mas necessário para gravar cadastros no banco): `npx supabase start`
2. Abra `index.html` no navegador (duplo clique ou sirva a pasta com um servidor local).
3. Preencha **todos** os campos: nome, e-mail, telefone e curso de interesse.
4. Escolha o herói (Vestibulando / Vestibulanda) e um dos 4 temas:
   - **Saúde** — Odonto, Fono, Enfermagem, Nutrição…
   - **Humanas e Sociais** — Direito, Pedagogia…
   - **Exatas** — Ciência da Computação, Engenharia…
   - **EaD** — Adm, Contábeis, Pedagogia, RH, Marketing, ADS, Gestão Ambiental…
5. Clique em **START — JOGAR** (só libera se o formulário estiver completo; o cadastro é salvo no Supabase).

### Cursos no formulário

- **Graduação Presencial** — Arquitetura, Ciência da Computação, Direito, Enfermagem, Engenharia Civil, Fisioterapia, Medicina Veterinária, Nutrição, Odontologia, Psicologia, Biomedicina…
- **Graduação Semipresencial** — Biomedicina, Educação Física, Farmácia, Fonoaudiologia, Nutrição, Pedagogia…
- **Graduação EaD** — Administração, Biomedicina, Contábeis, Educação Física, Farmácia, Nutrição, Pedagogia, ADS, Gestão Ambiental, RH, Marketing…

### Mobile

- Interface com **Bootstrap 5**, responsiva.
- No celular, jogue com o aparelho **deitado (paisagem)**. Em modo retrato aparece o aviso para girar.
- Controles touch (◀ ▶ PULAR Z) ficam abaixo do canvas.
- Logo oficial Unifeso em `assets/unifeso-logo.png`.

### Controles

| Tecla | Ação |
|-------|------|
| ← → / A D | Andar |
| Espaço / ↑ / W | Pular (duplo pulo no ar) |
| Z | Atacar |
| P / Esc | Pausar |

No celular, use os botões na tela.

### Áudio

- Música de fundo: `assets/audio/de-o-start.mp3`
- Controle **ON/OFF** + volume no canto inferior direito (volume salvo no `localStorage`)

## Tela inicial

- Card com fundo pixel do campus (`assets/bg-login.png`)
- Chuva de nomes de cursos em branco no fundo teal
- Título **DÊ O START / NA SUA CARREIRA** e botão **ADMIN**

## Admin (cadastros)

1. Na tela inicial, clique em **ADMIN**
2. Login: usuário `destart` · senha `destart`
3. Abre `admin.html` com a lista de cadastros

### Funções

| Recurso | Descrição |
|---------|-----------|
| **Grid** | Lista nome, e-mail, telefone, curso, tema, herói e data |
| **Filtros** | Por intervalo de **data** e por **curso** |
| **CRUD** | Novo, editar e excluir registros |
| **Exportar .XLS** | Exporta os registros **filtrados** |
| **Sair do cadastro** | Encerra a sessão admin e fecha a janela |

## Personagens

### Heróis (jogáveis)

| Personagem | Descrição |
|------------|-----------|
| **Vestibulando** | Herói menino Unifeso — boné teal, camisa com logo, mochila teal |
| **Vestibulanda** | Heroína menina Unifeso — boné teal, camisa com logo, mochila rosa |

Cor de pele selecionável em cada herói: **branco**, **pardo** e **negro** (preview e sprite no jogo em `assets/sprites/skins/`).

### Vilões por tema

#### Saúde
| Vilão | Observação |
|-------|------------|
| **Vírus** | Vírus verde com capa (`assets/enemies/virus.png`) — **boss** da fase |
| **Cárie** | Dente vilão com capa roxa e drill (`assets/enemies/carie.png`) |
| **Ruído** | Monstro sonoro com megafone (`assets/enemies/ruido.png`) |
| **Câncer** | Célula vilã com capa e laço (`assets/enemies/cancer.png`) |

#### Humanas e Sociais
| Vilão | Observação |
|-------|------------|
| **Processo** | Pilha de processos com capa e martelo (`assets/enemies/processo.png`) |
| **Corrupção** | Cartola e saco de dinheiro (`assets/enemies/corrupcao.png`) — **boss** da fase |
| **Fissura** | Golem de rocha com fendas de lava (`assets/enemies/fissura.png`) |
| **Réu Contumaz** | Presidiário com máscara e algemas (`assets/enemies/reu-contumaz.png`) |

#### Exatas
| Vilão | Observação |
|-------|------------|
| **Bug** | Inseto hacker com notebook (`assets/enemies/bug.png`) |
| **Malware** | Hacker com notebook e risco biológico (`assets/enemies/malware.png`) |
| **404** | Erro 404 com capa e glitch (`assets/enemies/404.png`) |
| **Stack Overflow** | Golem de abas e código (`assets/enemies/stack-overflow.png`) — **boss** da fase |

#### EaD
| Vilão | Observação |
|-------|------------|
| **Procrastinação** | Preguiça no notebook (`assets/enemies/procrastinacao.png`) |
| **Wi-Fi Caiu** | Sem conexão / roteador off (`assets/enemies/wifi-caiu.png`) |
| **Prazo** | Ampulheta e deadline (`assets/enemies/prazo.png`) — **boss** da fase |
| **Distração** | Hoodie, fone e redes sociais (`assets/enemies/distracao.png`) |

## Obstáculos

| Obstáculo | Efeito |
|-----------|--------|
| **Fossos** | Buracos no chão — cair tira vida e reposiciona o herói |
| **Espinhos** | Faixa de espinhos de fogo/magma (`assets/obstacles/espinhos.png`) — contato causa dano |
| **Plataformas** | Blocos elevados; exigem pulo (ou duplo pulo) |
| **Blocos ?** | Bater por baixo libera pontos/diploma |
| **Vilões** | Contato causa dano (é possível pisar por cima) |
| **Tiros do boss** | Orbes no fim da fase — desviar |
| **Queda** | Cair abaixo do mapa conta como dano |

## Coletável

- **Diplomas** — item coletável (`assets/items/vitamina.png`)
- Ataque lança um **diploma enrolado**

## Objetivo

A fase dura cerca de **1 minuto**. Colete diplomas, derrote os vilões e, no final, enfrente o **boss**. Depois disso a bandeira **Unifeso** libera a vitória.

Ao tocar a bandeira: splash com explosão, logo Unifeso e **50% de bolsa** (não acumulável).

No jogo, o título **DÊ O START / NA SUA CARREIRA** aparece na borda superior do fundo do tema.

## Cadastro → Supabase

Ao clicar em **START**, o jogo só inicia se **todos** os dados estiverem preenchidos. O cadastro vai para a tabela `cadastros`.

### Local (Docker)

```bash
npx supabase start
```

| Recurso | URL / arquivo |
|---------|----------------|
| API | http://127.0.0.1:54321 |
| Studio (Table Editor → `cadastros`) | http://127.0.0.1:54323 |
| Config do jogo | `js/supabase-config.js` |
| Schema / migration | `supabase/schema.sql` · `supabase/migrations/` |

Para parar: `npx supabase stop`

### Nuvem (opcional)

1. Crie o projeto em [supabase.com](https://supabase.com).
2. Rode `supabase/schema.sql` no SQL Editor.
3. Troque `url` / `anonKey` em `js/supabase-config.js`.

Fallback: se o banco estiver offline, os leads também ficam em `localStorage` (`dsnsc_leads`).

## Estrutura principal

```
index.html          → tela inicial + jogo
admin.html          → painel de cadastros (CRUD + filtros + XLS)
js/app.js           → fluxo do formulário, áudio, admin login
js/game.js          → engine do jogo
js/themes.js        → temas / vilões / bosses
js/leads.js         → API de cadastros (Supabase)
js/admin.js         → grid admin, filtros, exportação
js/supabase-config.js
assets/audio/       → trilha "Dê o Start"
assets/enemies/     → sprites dos vilões
assets/obstacles/   → espinhos
supabase/           → schema e migrations
```
