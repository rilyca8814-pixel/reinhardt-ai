# Reinhardt AI

Dashboard de investimentos brasileiros com front-end em React + Vite, backend em Express e visualizações com Recharts.

## Estrutura do projeto

- `client/` - frontend React/Vite
- `server/` - backend Express
- `package.json` - dependências e scripts principais

## Scripts úteis

- `npm install` - instala dependências
- `npm run dev` - inicia frontend e backend em modo de desenvolvimento
- `npm run build` - gera o build do frontend
- `npm run preview` - pré-visualiza o build do frontend
- `npm start` - inicia apenas o backend

## Rotas básicas do backend

- `GET /api/health`
- `GET /api/portfolio`
- `POST /api/chat`

## Navegação principal

A aplicação já possui os principais tabs:

- Dashboard
- Análise
- Aportes
- Renda
- Metas
- AI Chat
- Alertas

## Próximos passos

- implementar autenticação e persistência de dados
- adicionar integração real de IA
- construir dashboards de performance e alertas em tempo real
