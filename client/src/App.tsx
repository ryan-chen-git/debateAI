import React, { useState } from 'react';

function App() {
  const [topic, setTopic] = useState('');
  const [refinedTopic, setRefinedTopic] = useState('');
  const [selectedSide, setSelectedSide] = useState<'pro' | 'con' | null>(null);
  const [argument, setArgument] = useState('');
  const [validation, setValidation] = useState<{ valid: boolean; reason: string; refinedTopic?: string; suggestedRewrite?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'topic' | 'side' | 'argument'>('topic');

  // Call backend API to validate topic
  async function validateTopic(topic: string) {
    setLoading(true);
    setValidation(null);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/api/validate-topic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      
      const result = await response.json();
      setValidation(result);
      
      // If valid, save refined topic and move to side selection
      if (result.valid && result.refinedTopic) {
        setRefinedTopic(result.refinedTopic);
        setCurrentStep('side');
      }
    } catch (error) {
      setValidation({ 
        valid: false, 
        reason: 'Error validating topic. Please try again.' 
      });
    }
    
    setLoading(false);
  }

  const handleTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await validateTopic(topic);
  };

  const handleSideSelection = (side: 'pro' | 'con') => {
    setSelectedSide(side);
    setCurrentStep('argument');
  };

  const handleArgumentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Send argument to backend for debate
    alert(`Argument submitted! Side: ${selectedSide}, Topic: ${refinedTopic}`);
  };

  const resetToTopicEntry = () => {
    setCurrentStep('topic');
    setValidation(null);
    setTopic('');
    setRefinedTopic('');
    setSelectedSide(null);
    setArgument('');
  };

  // If topic is invalid, allow user to resubmit and show error below input
  const showTopicForm = currentStep === 'topic';
  const showSideSelection = currentStep === 'side';
  const showArgumentForm = currentStep === 'argument';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(120deg, #e3eafc 0%, #f7f7fa 100%)',
      padding: 0,
      fontFamily: 'Segoe UI, Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: 600,
        margin: '60px auto',
        padding: '32px',
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
        border: '1px solid #dbeafe'
      }}>
        <h1 style={{ textAlign: 'center', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>DebateAI</h1>
        <div style={{ textAlign: 'center', color: '#1976d2', fontSize: 18, marginBottom: 24 }}>
          <span style={{ fontWeight: 500 }}>Debate Stage</span>
        </div>
        <hr style={{ margin: '16px 0 32px 0', border: 'none', borderTop: '2px solid #e3eafc' }} />
        
        {/* Step 1: Topic Input */}
        {showTopicForm && (
          <form onSubmit={handleTopicSubmit} style={{ textAlign: 'center' }}>
            <div style={{
              background: '#f1f5fb',
              borderRadius: 8,
              padding: '24px 16px',
              boxShadow: '0 2px 8px rgba(25,118,210,0.04)',
              marginBottom: 24,
              border: '1px solid #dbeafe'
            }}>
              <label style={{ fontWeight: 600, fontSize: 18, marginBottom: 12, display: 'block' }}>
                Enter your debate topic:
              </label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                style={{
                  width: '80%',
                  padding: '10px',
                  fontSize: '1.1rem',
                  borderRadius: 4,
                  border: '1px solid #b6c7e6',
                  marginBottom: 8
                }}
                placeholder="Schools should require students to wear uniforms."
                required
              />
              <br />
              <button
                type="submit"
                style={{
                  padding: '10px 28px',
                  fontSize: '1rem',
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(25,118,210,0.08)'
                }}
                disabled={loading || !topic.trim()}
              >
                {loading ? 'Validating...' : 'Submit Topic'}
              </button>
              {/* Error message for invalid topic */}
              {validation && !validation.valid && (
                <div style={{
                  marginTop: 16,
                  color: '#a12d2d',
                  background: '#fdeaea',
                  borderRadius: 6,
                  padding: '10px',
                  border: '1.5px solid #f5c6cb',
                  fontWeight: 500,
                  fontSize: 16
                }}>
                  {validation.reason}
                  {validation.suggestedRewrite && (
                    <div style={{ marginTop: 8, fontStyle: 'italic' }}>
                      Try: "{validation.suggestedRewrite}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        )}

        {/* Step 2: Side Selection */}
        {showSideSelection && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              background: '#e6fbe6',
              borderRadius: 8,
              padding: '18px',
              marginBottom: 24,
              border: '1.5px solid #b6e6b6'
            }}>
              <h3 style={{ color: '#197d2b', margin: '0 0 8px 0' }}>Topic Accepted!</h3>
              <p style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>"{refinedTopic}"</p>
            </div>
            
            <h3 style={{ marginBottom: 24 }}>Choose your position:</h3>
            
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 24 }}>
              <button
                onClick={() => handleSideSelection('pro')}
                style={{
                  padding: '20px 30px',
                  fontSize: '1.1rem',
                  background: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(40,167,69,0.2)'
                }}
              >
                Argue FOR
              </button>
              <button
                onClick={() => handleSideSelection('con')}
                style={{
                  padding: '20px 30px',
                  fontSize: '1.1rem',
                  background: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(220,53,69,0.2)'
                }}
              >
                Argue AGAINST
              </button>
            </div>
            
            <button
              onClick={resetToTopicEntry}
              style={{
                padding: '8px 16px',
                fontSize: '0.9rem',
                background: 'transparent',
                color: '#6c757d',
                border: '1px solid #6c757d',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Change Topic
            </button>
          </div>
        )}

        {/* Step 3: Argument Input */}
        {showArgumentForm && (
          <div>
            <div style={{
              background: '#f8f9fa',
              borderRadius: 8,
              padding: '16px',
              marginBottom: 24,
              border: '1px solid #dee2e6'
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 500 }}>
                You are arguing <strong style={{ color: selectedSide === 'pro' ? '#28a745' : '#dc3545' }}>
                  {selectedSide === 'pro' ? 'FOR' : 'AGAINST'}
                </strong>:
              </p>
              <p style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>"{refinedTopic}"</p>
            </div>
            
            <form onSubmit={handleArgumentSubmit}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 17, marginBottom: 8 }}>
                Your Constructive Argument:
              </label>
              <textarea
                value={argument}
                onChange={e => setArgument(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '10px',
                  fontSize: '1rem',
                  borderRadius: 4,
                  border: '1px solid #b6c7e6',
                  marginBottom: 16
                }}
                placeholder="Type your argument here..."
                required
              />
              <div style={{ display: 'flex', gap: 16 }}>
                <button
                  type="submit"
                  style={{
                    padding: '10px 24px',
                    fontSize: '1rem',
                    background: '#1976d2',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(25,118,210,0.08)'
                  }}
                >
                  Submit Argument
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep('side')}
                  style={{
                    padding: '10px 24px',
                    fontSize: '1rem',
                    background: 'transparent',
                    color: '#6c757d',
                    border: '1px solid #6c757d',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  Change Side
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
