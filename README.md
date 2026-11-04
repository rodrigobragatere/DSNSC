# Dê o Start na sua Carreira — Unifeso

Jogo arcade estilo plataforma (Mario-like) em **HTML Canvas + CSS + JavaScript**, no tema do Vestibular Unifeso 2027.

## Como jogar

1. Abra `index.html` no navegador (duplo clique ou sirva a pasta com um servidor local).
2. Preencha nome, e-mail, telefone e curso de interesse.
3. Escolha um dos 4 avatares/temas:
   - **Saúde** — Odonto, Fono, Enfermagem, Nutrição
   - **Humanas e Sociais** — Direito, Arquitetura, Engenharia
   - **Tecnológicas** — Ciência da Computação
   - **EaD** — cursos online Unifeso (Adm, Contábeis, Pedagogia, RH, Marketing, ADS, Gestão Ambiental…)
4. Clique em **START — JOGAR**.

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

## Personagens

### Heróis (jogáveis)

| Personagem | Descrição |
|------------|-----------|
| **Vestibulando** | Herói menino Unifeso — boné teal, camisa com logo, mochila teal |
| **Vestibulanda** | Heroína menina Unifeso — boné teal, camisa com logo, mochila rosa |

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

#### Tecnológicas
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
| **Espinhos** | Faixa de espinhos de fogo/magma no chão (`assets/obstacles/espinhos.png`) — contato causa dano |
| **Plataformas** | Blocos elevados; exigem pulo (ou duplo pulo) para atravessar |
| **Blocos ?** | Blocos mistério; bater por baixo libera pontos/diploma |
| **Vilões** | Andam pelo mapa; contato causa dano (é possível pisar por cima) |
| **Tiros do boss** | Orbes disparadas pelo boss no fim da fase — evitá-las ou desviar |
| **Queda** | Cair abaixo do mapa conta como dano (como o fosso) |

## Coletável

- **Diplomas** — item coletável no lugar dos pontos (`assets/items/vitamina.png`)
- Ataque lança um **diploma enrolado** (sem fogo)

## Objetivo

A fase dura cerca de **1 minuto** de percurso. Colete diplomas, derrote os vilões temáticos e, no final, enfrente o **boss** (maior, com vida e tiros). Só depois disso a bandeira **Unifeso** libera a vitória.

Ao tocar a bandeira, aparece um splash com explosão, logo Unifeso e o prêmio: **50% de bolsa** (não acumulável).

Leads do formulário ficam salvos em `localStorage` (`dsnsc_leads`) para possível integração futura com CRM.
