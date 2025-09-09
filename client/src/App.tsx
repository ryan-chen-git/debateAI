import React, { useState } from 'react';

function App() {
  const [topic, setTopic] = useState('');
  const [refinedTopic, setRefinedTopic] = useState('');
  const [selectedSide, setSelectedSide] = useState<'pro' | 'con' | null>(null);
  const [argument, setArgument] = useState('');
  const [validation, setValidation] = useState<{ valid: boolean; reason: string; refinedTopic?: string; suggestedRewrite?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'topic' | 'side' | 'argument'>('topic');

  // Call backend API to validate topic using Gemini AI
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
      background: 'linear-gradient(120deg, #1e3a8a 0%, #3730a3 50%, #1e40af 100%)',
      padding: 0,
      fontFamily: 'Segoe UI, Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: 2000,
        margin: '0 auto',
        padding: '20px',
        background: '#fff',
        minHeight: '100vh',
        boxShadow: '0 0 40px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Header - only show on non-argument steps */}
        {(showTopicForm || showSideSelection) && (
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ 
              fontWeight: 700, 
              letterSpacing: 1, 
              marginBottom: 8,
              color: '#1e3a8a',
              fontSize: '2.5rem',
              margin: '20px 0 8px 0'
            }}>
              DebateAI
            </h1>
            <div style={{ 
              color: '#fbbf24', 
              fontSize: 18, 
              marginBottom: 24,
              fontWeight: 600
            }}>
              <span style={{ fontWeight: 500 }}>Academic Debate Platform</span>
            </div>
            <hr style={{ 
              margin: '16px auto 32px auto', 
              border: 'none', 
              borderTop: '3px solid #fbbf24',
              maxWidth: '200px'
            }} />
          </div>
        )}

        {/* Argument step with responsive layout */}
        {showArgumentForm && (
          <div style={{ 
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            height: '100vh',
            gap: '0px'
          }}>
            {/* Left side - Header and Argument Form */}
            <div style={{ 
              flex: '1 1 400px',
              minWidth: '400px',
              padding: '20px 30px 20px 20px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Logo positioned for argument step */}
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ 
                  fontWeight: 700, 
                  letterSpacing: 1,
                  color: '#1e3a8a',
                  fontSize: '2rem',
                  margin: '0 0 8px 0'
                }}>
                  DebateAI
                </h1>
                <div style={{ 
                  color: '#fbbf24', 
                  fontSize: 16, 
                  fontWeight: 600
                }}>
                  Academic Debate Platform
                </div>
              </div>

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
              
              <form onSubmit={handleArgumentSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 17, marginBottom: 8 }}>
                  Your Constructive Argument:
                </label>
                <textarea
                  value={argument}
                  onChange={e => setArgument(e.target.value)}
                  style={{
                    width: '100%',
                    flex: 1,
                    minHeight: '250px',
                    padding: '12px',
                    fontSize: '1rem',
                    borderRadius: 6,
                    border: '2px solid #1e3a8a',
                    marginBottom: 16,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Type your constructive argument here..."
                  required
                />
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    style={{
                      padding: '12px 24px',
                      fontSize: '1rem',
                      background: '#1e3a8a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 600,
                      boxShadow: '0 2px 8px rgba(30,58,138,0.2)'
                    }}
                  >
                    Submit Argument
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('side')}
                    style={{
                      padding: '12px 24px',
                      fontSize: '1rem',
                      background: 'transparent',
                      color: '#6c757d',
                      border: '2px solid #6c757d',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                  >
                    Change Side
                  </button>
                </div>
              </form>
            </div>

            {/* Right side - Rubric */}
            <div style={{ 
              flex: '0 0 350px',
              minWidth: '350px',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
              color: '#fff',
              padding: '20px',
              boxShadow: '0 4px 16px rgba(30,58,138,0.3)',
              overflowY: 'auto',
              height: '100vh'
            }}>
              <h3 style={{ 
                margin: '0 0 20px 0', 
                fontSize: '1.2rem', 
                fontWeight: 700,
                color: '#fbbf24',
                textAlign: 'center'
              }}>
                ROUND 1: CONSTRUCTIVE RUBRIC
              </h3>
              
              <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ 
                    background: 'rgba(251,191,36,0.2)', 
                    padding: '10px', 
                    borderRadius: 6, 
                    marginBottom: 10,
                    border: '1px solid #fbbf24'
                  }}>
                    <strong style={{ color: '#fbbf24' }}>Thesis & Claim Clarity (20%)</strong>
                  </div>
                  <div style={{ paddingLeft: '10px', marginBottom: '12px' }}>
                    Clear, specific thesis with scoped, non-vague claims.
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ 
                    background: 'rgba(251,191,36,0.2)', 
                    padding: '10px', 
                    borderRadius: 6, 
                    marginBottom: 10,
                    border: '1px solid #fbbf24'
                  }}>
                    <strong style={{ color: '#fbbf24' }}>Evidence Quality (25%)</strong>
                  </div>
                  <div style={{ paddingLeft: '10px', marginBottom: '12px' }}>
                    Concrete, credible support tied directly to claims.
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ 
                    background: 'rgba(251,191,36,0.2)', 
                    padding: '10px', 
                    borderRadius: 6, 
                    marginBottom: 10,
                    border: '1px solid #fbbf24'
                  }}>
                    <strong style={{ color: '#fbbf24' }}>Warrants/Reasoning (25%)</strong>
                  </div>
                  <div style={{ paddingLeft: '10px', marginBottom: '12px' }}>
                    Explicit "why" the evidence proves the claim.
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ 
                    background: 'rgba(251,191,36,0.2)', 
                    padding: '10px', 
                    borderRadius: 6, 
                    marginBottom: 10,
                    border: '1px solid #fbbf24'
                  }}>
                    <strong style={{ color: '#fbbf24' }}>Anticipation/Pre-emption (10%)</strong>
                  </div>
                  <div style={{ paddingLeft: '10px', marginBottom: '12px' }}>
                    Anticipates obvious counters without strawmen.
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ 
                    background: 'rgba(251,191,36,0.2)', 
                    padding: '10px', 
                    borderRadius: 6, 
                    marginBottom: 10,
                    border: '1px solid #fbbf24'
                  }}>
                    <strong style={{ color: '#fbbf24' }}>Structure & Coherence (15%)</strong>
                  </div>
                  <div style={{ paddingLeft: '10px', marginBottom: '12px' }}>
                    Logical flow, signposting, no redundancy, within cap.
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ 
                    background: 'rgba(251,191,36,0.2)', 
                    padding: '10px', 
                    borderRadius: 6, 
                    marginBottom: 10,
                    border: '1px solid #fbbf24'
                  }}>
                    <strong style={{ color: '#fbbf24' }}>Style & Concision (5%)</strong>
                  </div>
                  <div style={{ paddingLeft: '10px' }}>
                    Persuasive but tight; no padding.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Non-argument steps */}
        {!showArgumentForm && (
          <div style={{ maxWidth: '1900px', margin: '0 auto' }}>
            {/* Step 1: Topic Input */}
            {showTopicForm && (
              <div style={{ width: '95%', minWidth: '1200px', margin: '0 auto' }}>
                <form onSubmit={handleTopicSubmit} style={{ textAlign: 'center' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                    borderRadius: 16,
                    padding: '48px 32px',
                    boxShadow: '0 8px 24px rgba(30,58,138,0.25)',
                    marginBottom: 32,
                    border: '3px solid #1e3a8a'
                  }}>
                    <label style={{ 
                      fontWeight: 700, 
                      fontSize: 28, 
                      marginBottom: 24, 
                      display: 'block',
                      color: '#1e3a8a'
                    }}>
                      Enter your debate topic:
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      style={{
                        width: '95%',
                        minWidth: '800px',
                        padding: '18px 24px',
                        fontSize: '1.3rem',
                        borderRadius: 12,
                        border: '3px solid #1e3a8a',
                        marginBottom: 24,
                        textAlign: 'center',
                        fontWeight: 500,
                        boxShadow: '0 2px 8px rgba(30,58,138,0.1)',
                        boxSizing: 'border-box'
                      }}
                      placeholder="Example: Schools should require students to wear uniforms."
                      required
                    />
                    <br />
                    <button
                      type="submit"
                      style={{
                        padding: '16px 48px',
                        fontSize: '1.3rem',
                        background: loading ? '#6b7280' : '#1e3a8a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 12,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontWeight: 700,
                        boxShadow: '0 6px 16px rgba(30,58,138,0.4)',
                        marginTop: '8px'
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
              </div>
            )}

            {/* Step 2: Side Selection */}
            {showSideSelection && (
              <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                  borderRadius: 12,
                  padding: '24px',
                  marginBottom: 32,
                  border: '2px solid #10b981'
                }}>
                  <h3 style={{ color: '#047857', margin: '0 0 12px 0', fontSize: '1.4rem' }}>Topic Accepted!</h3>
                  <p style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1e3a8a' }}>"{refinedTopic}"</p>
                </div>
                
                <h3 style={{ marginBottom: 32, color: '#1e3a8a', fontSize: '1.5rem' }}>Choose your position:</h3>
                
                <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleSideSelection('pro')}
                    style={{
                      padding: '24px 36px',
                      fontSize: '1.2rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 12,
                      cursor: 'pointer',
                      fontWeight: 600,
                      boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
                      minWidth: '160px'
                    }}
                  >
                    Argue FOR
                  </button>
                  <button
                    onClick={() => handleSideSelection('con')}
                    style={{
                      padding: '24px 36px',
                      fontSize: '1.2rem',
                      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 12,
                      cursor: 'pointer',
                      fontWeight: 600,
                      boxShadow: '0 4px 16px rgba(220,38,38,0.3)',
                      minWidth: '160px'
                    }}
                  >
                    Argue AGAINST
                  </button>
                </div>
                
                <button
                  onClick={resetToTopicEntry}
                  style={{
                    padding: '12px 24px',
                    fontSize: '1rem',
                    background: 'transparent',
                    color: '#6b7280',
                    border: '2px solid #6b7280',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  Change Topic
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
