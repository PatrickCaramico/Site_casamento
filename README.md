# Site de Casamento - Patrick & Lara

Projeto de site de casamento desenvolvido com Vite + TypeScript, com:

- Contagem regressiva para o grande dia
- Seções de cerimônia e comemoração
- Formulário RSVP com envio para Google Sheets
- Campos dinâmicos para acompanhantes adultos e crianças
- Layout responsivo para desktop e mobile

## Tecnologias

- Vite
- TypeScript
- HTML5
- CSS3

## Como rodar localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com:

```env
VITE_GOOGLE_SCRIPT_URL=https://SEU-DEPLOY-DO-APPS-SCRIPT/exec
```

### 3. Iniciar ambiente de desenvolvimento

```bash
npm run dev
```

A aplicação ficará disponível em um endereço como:

- http://localhost:5173/

## Scripts disponíveis

```bash
npm run dev      # roda localmente
npm run build    # gera build de produção
npm run preview  # pré-visualiza build local
```

## RSVP e Google Sheets

O formulário envia os dados para o Google Apps Script (via `VITE_GOOGLE_SCRIPT_URL`).

Campos enviados:

- name
- ceremonyAttendance
- restaurantAttendance
- adultsCount
- companionNames
- childrenCount
- childrenNames
- message
- timestamp
- source

### Comportamento dos campos dinâmicos

- Adultos (incluindo o convidado principal): de 1 a 10
- Crianças: de 0 a 10
- Se adultos > 1, aparecem inputs para nomes dos acompanhantes
- Se crianças > 0, aparecem inputs para nomes das crianças

## Build e publicação

### Publicar no GitHub

1. Commit das alterações
2. Push para o repositório

### Publicar no GitHub Pages (opcional)

O projeto já está com `base: './'` no Vite, o que ajuda na execução em caminhos relativos.

Passos recomendados:

1. Gerar build:

```bash
npm run build
```

2. Publicar o conteúdo da pasta `dist` no GitHub Pages (via Action ou branch de deploy).

## Estrutura principal

```text
index.html
src/
  main.ts
  style.css
public/
  assets/
```

## Melhorias futuras

- Mensagem de confirmação personalizada por número de convidados
- Máscara/validação adicional para nomes
- Painel administrativo para acompanhar confirmações

---

Feito com carinho para o casamento de Patrick & Lara.
