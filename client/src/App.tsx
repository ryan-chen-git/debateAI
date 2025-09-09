import React, { useState } from 'react';

type DebateStep = 'topic' | 'side' | 'chat';
type Side = 'pro' | 'con';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  side: Side;
  message: string;
  timestamp: Date;
  wordCount: number;
  usedFallback?: boolean;
}

function App() {
  const [step, setStep] = useState<DebateStep>('topic');
  const [topic, setTopic] = useState('');
  const [submittedTopic, setSubmittedTopic] = useState<string | null>(null);
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [roundCount, setRoundCount] = useState(1);

  const TOPIC_CAP = 80; // cap topic to 80 characters
  const ARGUMENT_CAP = 180; // cap arguments to 180 words

  const handleTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cappedTopic = topic.slice(0, TOPIC_CAP);
    setSubmittedTopic(cappedTopic);
    
    // Skip validation - allow any topic!
    if (cappedTopic.trim()) {
      setStep('side');
    }
  };

  const handleSideSelection = (side: Side) => {
    setSelectedSide(side);
    setStep('chat');
    
    // Add welcome message from AI
    const welcomeMessage: ChatMessage = {
      id: `ai-welcome-${Date.now()}`,
      sender: 'ai',
      side: side === 'pro' ? 'con' : 'pro',
      message: `Alright, let's debate! I'll be arguing ${side === 'pro' ? 'against' : 'for'} "${submittedTopic}". You start us off with your ${side} argument!`,
      timestamp: new Date(),
      wordCount: 0,
      usedFallback: false
    };
    
    setChatMessages([welcomeMessage]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSide || !currentMessage.trim() || !submittedTopic || loading) return;

    const wordCount = getWordCount(currentMessage);
    if (wordCount > ARGUMENT_CAP) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      side: selectedSide,
      message: currentMessage.trim(),
      timestamp: new Date(),
      wordCount
    };

    setChatMessages(prev => [...prev, userMessage]);
    const messageToSend = currentMessage.trim();
    setCurrentMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/debate/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          side: selectedSide, 
          argument: messageToSend,
          topic: submittedTopic
        })
      });
      const data = await res.json();
      
      if (data.success && data.aiCounterArgument) {
        // Add AI response to chat
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          side: data.aiCounterArgument.side,
          message: data.aiCounterArgument.argument,
          timestamp: new Date(),
          wordCount: getWordCount(data.aiCounterArgument.argument),
          usedFallback: data.aiCounterArgument.usedFallback
        };

        setChatMessages(prev => [...prev, aiMessage]);
        setRoundCount(prev => prev + 1);
      } else {
        // Add error message
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          sender: 'ai',
          side: selectedSide === 'pro' ? 'con' : 'pro',
          message: "Sorry, I'm having trouble generating a response right now. Try again!",
          timestamp: new Date(),
          wordCount: 0,
          usedFallback: true
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
    } catch {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'ai',
        side: selectedSide === 'pro' ? 'con' : 'pro',
        message: "Connection error! Please check your internet and try again.",
        timestamp: new Date(),
        wordCount: 0,
        usedFallback: true
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
    setLoading(false);
  };

  const resetToTopic = () => {
    setStep('topic');
    setTopic('');
    setSubmittedTopic(null);
    setSelectedSide(null);
    setCurrentMessage('');
    setChatMessages([]);
    setRoundCount(1);
  };


  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  return (
    <div className="App" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      maxWidth: '900px', 
      margin: '0 auto', 
      backgroundColor: '#f5f5f5' 
    }}>
      
      {/* Header */}
      <div style={{ 
        backgroundColor: '#2196F3', 
        color: 'white', 
        padding: '1rem', 
        textAlign: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0', fontSize: '1.5em' }}>🎯 DebateAI Chat</h1>
        {submittedTopic && (
          <div style={{ fontSize: '0.9em', opacity: 0.9, marginTop: '0.5rem' }}>
            Topic: {submittedTopic}
          </div>
        )}
      </div>
      
      {/* Step 1: Topic Validation */}
      {step === 'topic' && (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: '2rem'
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '2rem', 
            borderRadius: '15px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            width: '100%',
            maxWidth: '500px'
          }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>What should we debate? 🤔</h2>
            <form onSubmit={handleTopicSubmit}>
              <input
                id="topic-input"
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '1rem', 
                  fontSize: '1em',
                  border: '2px solid #ddd',
                  borderRadius: '10px',
                  marginBottom: '1rem'
                }}
                placeholder="e.g. Are hot dogs sandwiches? Should we colonize Mars? Is cereal soup?"
                maxLength={TOPIC_CAP}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <span style={{ fontSize: '0.9em', color: '#666' }}>
                  {topic.length}/{TOPIC_CAP} characters
                </span>
                <button 
                  type="submit" 
                  disabled={loading || !topic.trim()}
                  style={{ 
                    padding: '0.75rem 1.5rem',
                    fontSize: '1em',
                    backgroundColor: loading || !topic.trim() ? '#ccc' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading || !topic.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? '🔄 Checking...' : '✅ Let\'s Debate!'}
                </button>
              </div>
            </form>
            
            <div style={{ 
              marginTop: '1rem', 
              color: '#4CAF50', 
              padding: '1rem', 
              backgroundColor: '#e8f5e8', 
              borderRadius: '8px',
              fontSize: '0.9em'
            }}>
              💬 <strong>No restrictions!</strong> Debate anything you want - from serious topics to random thoughts!
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Side Selection */}
      {step === 'side' && submittedTopic && (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: '2rem'
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '2rem', 
            borderRadius: '15px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            width: '100%',
            maxWidth: '500px',
            textAlign: 'center'
          }}>
            <h2>Pick your side! 🥊</h2>
            <div style={{ 
              marginBottom: '2rem', 
              padding: '1rem', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '8px',
              fontSize: '1.1em'
            }}>
              <strong>Topic:</strong> {submittedTopic}
            </div>
            
            <p style={{ marginBottom: '2rem', color: '#666' }}>
              Choose your position and start the debate!
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
              <button
                onClick={() => handleSideSelection('pro')}
                style={{
                  padding: '1rem 2rem',
                  fontSize: '1.1em',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  minWidth: '140px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                👍 Pro (For)
              </button>
              
              <button
                onClick={() => handleSideSelection('con')}
                style={{
                  padding: '1rem 2rem',
                  fontSize: '1.1em',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  minWidth: '140px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                👎 Con (Against)
              </button>
            </div>
            
            <button 
              onClick={resetToTopic}
              style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: '#e0e0e0', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                color: '#666'
              }}
            >
              🔙 Change Topic
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Chat Interface */}
      {step === 'chat' && submittedTopic && selectedSide && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: 'calc(100vh - 80px)', 
          backgroundColor: 'white'
        }}>
          
          {/* Chat Header */}
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#f8f9fa', 
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <strong>Round {roundCount}</strong> • You: <span style={{ 
                color: selectedSide === 'pro' ? '#4CAF50' : '#f44336',
                fontWeight: 'bold'
              }}>
                {selectedSide === 'pro' ? '👍 Pro' : '👎 Con'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => setStep('side')}
                style={{ 
                  padding: '0.5rem 1rem', 
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9em'
                }}
              >
                🔄 Switch Side
              </button>
              <button 
                onClick={resetToTopic}
                style={{ 
                  padding: '0.5rem 1rem', 
                  backgroundColor: '#e0e0e0',
                  color: '#666',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9em'
                }}
              >
                🆕 New Topic
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {chatMessages.map((message) => (
              <div 
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  maxWidth: '70%',
                  padding: '1rem',
                  borderRadius: message.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  backgroundColor: message.sender === 'user' 
                    ? (message.side === 'pro' ? '#4CAF50' : '#f44336')
                    : '#e3f2fd',
                  color: message.sender === 'user' ? 'white' : '#333',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ 
                    fontSize: '0.8em', 
                    opacity: 0.8, 
                    marginBottom: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>
                      {message.sender === 'user' ? '👤 You' : '🤖 AI'} • 
                      {message.side === 'pro' ? ' Pro' : ' Con'}
                      {message.usedFallback && ' (Fallback)'}
                    </span>
                    {message.wordCount > 0 && (
                      <span>{message.wordCount} words</span>
                    )}
                  </div>
                  <div style={{ fontSize: '1em', lineHeight: '1.4' }}>
                    {message.message}
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '1rem',
                  borderRadius: '18px 18px 18px 4px',
                  backgroundColor: '#e3f2fd',
                  color: '#666'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🤖 AI is typing
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#666', animation: 'pulse 1.4s infinite' }}></div>
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#666', animation: 'pulse 1.4s infinite 0.2s' }}></div>
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#666', animation: 'pulse 1.4s infinite 0.4s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div style={{ 
            padding: '1rem', 
            borderTop: '1px solid #e0e0e0',
            backgroundColor: '#f8f9fa'
          }}>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <textarea
                  value={currentMessage}
                  onChange={e => setCurrentMessage(e.target.value)}
                  placeholder={`Make your ${selectedSide} argument... (max ${ARGUMENT_CAP} words)`}
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    maxHeight: '120px',
                    padding: '0.75rem',
                    border: '2px solid #ddd',
                    borderRadius: '12px',
                    fontSize: '1em',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginTop: '0.5rem',
                  fontSize: '0.9em'
                }}>
                  <span style={{ 
                    color: getWordCount(currentMessage) > ARGUMENT_CAP ? '#f44336' : '#666' 
                  }}>
                    {getWordCount(currentMessage)}/{ARGUMENT_CAP} words
                  </span>
                  {getWordCount(currentMessage) > ARGUMENT_CAP && (
                    <span style={{ color: '#f44336' }}>⚠️ Too long!</span>
                  )}
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={loading || !currentMessage.trim() || getWordCount(currentMessage) > ARGUMENT_CAP}
                style={{
                  padding: '1rem',
                  backgroundColor: loading || !currentMessage.trim() || getWordCount(currentMessage) > ARGUMENT_CAP ? '#ccc' : '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: loading || !currentMessage.trim() || getWordCount(currentMessage) > ARGUMENT_CAP ? 'not-allowed' : 'pointer',
                  fontSize: '1.2em',
                  minWidth: '60px'
                }}
              >
                {loading ? '⏳' : '🚀'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
