import React, { useState } from 'react';

function App() {
  const [topic, setTopic] = useState('');
  const [submittedTopic, setSubmittedTopic] = useState<string | null>(null);
  const [validation, setValidation] = useState<{ valid: boolean; reason: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const TOPIC_CAP = 80; // cap topic to 80 characters
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cappedTopic = topic.slice(0, TOPIC_CAP);
    setSubmittedTopic(cappedTopic);
    setValidation(null);
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/validate-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: cappedTopic })
      });
      const data = await res.json();
      setValidation(data);
    } catch {
      setValidation({ valid: false, reason: 'Server error.' });
    }
    setLoading(false);
  };

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '3rem' }}>
      <h1>DebateAI</h1>
      <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
        <label htmlFor="topic-input">Enter your debate topic:</label>
        <input
          id="topic-input"
          type="text"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          style={{ marginLeft: '1rem', padding: '0.5rem', minWidth: '300px' }}
          placeholder="e.g. Should universities ban cars on campus?"
        />
        <button type="submit" style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }} disabled={loading}>
          {loading ? 'Checking...' : 'Submit'}
        </button>
      </form>
      {submittedTopic && (
        <div>
          <h2>Selected Topic:</h2>
          <p>{submittedTopic}</p>
        </div>
      )}
      {validation && (
        <div style={{ marginTop: '1rem', color: validation.valid ? 'green' : 'red' }}>
          <strong>{validation.valid ? 'Valid topic!' : 'Invalid topic.'}</strong>
          <div>{validation.reason}</div>
        </div>
      )}
    </div>
  );
}

export default App;
