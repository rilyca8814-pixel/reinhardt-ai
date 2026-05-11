import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Reinhardt AI' });
});

app.get('/api/portfolio', (req, res) => {
  res.json({
    summary: 'Visão inicial do portfólio',
    cash: 32000,
    investments: 152000,
    returns: 0.14,
    assets: [
      { name: 'Ações', value: 85000, allocation: 0.56 },
      { name: 'Renda Fixa', value: 42000, allocation: 0.28 },
      { name: 'Cripto', value: 15000, allocation: 0.10 },
      { name: 'FIIs', value: 10000, allocation: 0.06 }
    ]
  });
});

app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  res.json({
    message,
    reply: 'Este é um exemplo de resposta de IA. Integração com modelo avançado pode ser adicionada depois.'
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
