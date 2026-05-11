import { useState } from 'react';

function AIChat() {
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');

  const handleSend = async () => {
    if (!message.trim()) return;
    setReply('Consultando IA...');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await response.json();
      setReply(data.reply);
    } catch (error) {
      setReply('Erro ao conectar com o servidor de IA.');
    }
  };

  return (
    <section className="page-page">
      <h2>AI Chat</h2>
      <p>Converse com a assistente inteligente sobre sua carteira e metas.</p>
      <div className="chat-card card">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Pergunte algo sobre seus investimentos..."
        />
        <button type="button" onClick={handleSend}>Enviar</button>
      </div>
      {reply && (
        <div className="card response-card">
          <h3>Resposta</h3>
          <p>{reply}</p>
        </div>
      )}
    </section>
  );
}

export default AIChat;
