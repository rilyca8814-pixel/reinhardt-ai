import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  return (
    <div style={{fontFamily: 'system-ui, sans-serif', padding: '2rem'}}>
      <h1>Reinhardt AI</h1>
      <p>Minimal React + Vite app.</p>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
