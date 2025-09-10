import React, { useState, useRef, useEffect } from 'react';
import { DebateSession, DebateRound } from '../../lib/types';

const App: React.FC = () => {
  const [session, setSession] = useState<DebateSession | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [position, setPosition] = useState<'for' | 'against'>('for');
  const [startingPlayer, setStartingPlayer] = useState<'human' | 'ai'>('human');
  const [isWaitingForAI, setIsWaitingForAI] = useState<boolean>(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest round
  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [session]);

  const startDebate = async () => {
    if (!topic.trim()) {
      setError('Please enter a debate topic');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/start-debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), position, startingPlayer })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setSession(data.session);
      setCurrentInput('');
      
      // If AI starts first, get AI response
      if (startingPlayer === 'ai') {
        setIsWaitingForAI(true);
        setTimeout(async () => {
          try {
            const aiResponse = await fetch('/api/ai-response', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: data.session.id })
            });
            
            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              setSession(aiData.session);
            }
          } catch (aiError) {
            console.error('AI response error:', aiError);
          } finally {
            setIsWaitingForAI(false);
          }
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start debate');
    } finally {
      setIsLoading(false);
    }
  };

  const submitArgument = async () => {
    if (!session || !currentInput.trim() || isWaitingForAI) return;
    
    setIsWaitingForAI(true);
    
    try {
      const response = await fetch('/api/submit-argument', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          argument: currentInput.trim()
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setSession(data.session);
      setCurrentInput('');
      
      // Get AI response if debate isn't complete
      if (!data.session.isComplete) {
        setTimeout(async () => {
          try {
            const aiResponse = await fetch('/api/ai-response', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: data.session.id })
            });
            
            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              setSession(aiData.session);
            }
          } catch (aiError) {
            console.error('AI response error:', aiError);
          } finally {
            setIsWaitingForAI(false);
          }
        }, 2000);
      } else {
        setIsWaitingForAI(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit argument');
      setIsWaitingForAI(false);
    }
  };

  const newDebate = () => {
    setSession(null);
    setTopic('');
    setCurrentInput('');
    setError('');
    setIsWaitingForAI(false);
  };

  const getRoundTitle = (round: number): string => {
    switch (round) {
      case 1: return 'CONSTRUCTIVE';
      case 2: return 'CROSS-EXAMINATION';
      case 3: return 'REBUTTAL';
      case 4: return 'CLOSING ARGUMENTS';
      default: return `ROUND ${round}`;
    }
  };

  const getRubricForRound = (round: number) => {
    const rubrics = {
      1: { // Constructive
        title: 'CONSTRUCTIVE',
        totalPoints: 30,
        weight: 30,
        criteria: [
          { name: 'Clarity', points: '8 pts', description: 'Clear and logical presentation of main arguments' },
          { name: 'Evidence', points: '10 pts', description: 'Strong supporting evidence and examples' },
          { name: 'Structure', points: '7 pts', description: 'Well-organized argument flow' },
          { name: 'Relevance', points: '5 pts', description: 'Arguments directly address the topic' }
        ]
      },
      2: { // Cross-Ex
        title: 'CROSS-EXAMINATION',
        totalPoints: 10,
        weight: 10,
        criteria: [
          { name: 'Questions', points: '4 pts', description: 'Thoughtful and probing questions' },
          { name: 'Responses', points: '3 pts', description: 'Clear and direct answers' },
          { name: 'Strategy', points: '3 pts', description: 'Effective use of questioning to advance position' }
        ]
      },
      3: { // Rebuttal
        title: 'REBUTTAL',
        totalPoints: 35,
        weight: 35,
        criteria: [
          { name: 'Counter-arguments', points: '12 pts', description: 'Strong responses to opponent arguments' },
          { name: 'Defense', points: '10 pts', description: 'Effective defense of own position' },
          { name: 'Analysis', points: '8 pts', description: 'Deep analysis of key issues' },
          { name: 'Impact', points: '5 pts', description: 'Explanation of argument significance' }
        ]
      },
      4: { // Closing
        title: 'CLOSING ARGUMENTS',
        totalPoints: 25,
        weight: 25,
        criteria: [
          { name: 'Summary', points: '8 pts', description: 'Effective summary of key points' },
          { name: 'Final Appeal', points: '10 pts', description: 'Compelling final argument' },
          { name: 'Resolution', points: '7 pts', description: 'Clear conclusion and call to action' }
        ]
      }
    };
    return rubrics[round as keyof typeof rubrics] || rubrics[1];
  };

  // Setup/Topic Selection Screen
  if (!session) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(120deg, #1e3a8a 0%, #3730a3 50%, #1e40af 100%)',
        padding: 0,
        fontFamily: 'Segoe UI, Arial, sans-serif'
      }}>
        <div style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: '40px 20px',
          background: '#fff',
          minHeight: '100vh',
          boxShadow: '0 0 40px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ 
              fontWeight: 700, 
              letterSpacing: 1,
              color: '#1e3a8a',
              fontSize: '3rem',
              margin: '0 0 8px 0'
            }}>
              DebateAI
            </h1>
            <div style={{ 
              color: '#64748b',
              fontSize: '1.2rem',
              fontWeight: 400,
              letterSpacing: 0.5 
            }}>
              Academic Debate Training System
            </div>
          </div>

          <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <div style={{
              background: '#f8fafc',
              padding: '30px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              marginBottom: '30px'
            }}>
              <h2 style={{ color: '#1e3a8a', marginBottom: '20px', textAlign: 'center' }}>
                Setup Your Debate
              </h2>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                  Debate Topic:
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter your debate topic..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 6,
                    border: '2px solid #d1d5db',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && startDebate()}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                  Your Position:
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setPosition('for')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '2px solid',
                      borderColor: position === 'for' ? '#059669' : '#d1d5db',
                      backgroundColor: position === 'for' ? '#d1fae5' : '#fff',
                      color: position === 'for' ? '#059669' : '#374151',
                      borderRadius: 6,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    FOR (Supporting)
                  </button>
                  <button
                    onClick={() => setPosition('against')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '2px solid',
                      borderColor: position === 'against' ? '#dc2626' : '#d1d5db',
                      backgroundColor: position === 'against' ? '#fee2e2' : '#fff',
                      color: position === 'against' ? '#dc2626' : '#374151',
                      borderRadius: 6,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    AGAINST (Opposing)
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                  Who Goes First:
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setStartingPlayer('human')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '2px solid',
                      borderColor: startingPlayer === 'human' ? '#2563eb' : '#d1d5db',
                      backgroundColor: startingPlayer === 'human' ? '#dbeafe' : '#fff',
                      color: startingPlayer === 'human' ? '#2563eb' : '#374151',
                      borderRadius: 6,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    You Start
                  </button>
                  <button
                    onClick={() => setStartingPlayer('ai')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '2px solid',
                      borderColor: startingPlayer === 'ai' ? '#7c3aed' : '#d1d5db',
                      backgroundColor: startingPlayer === 'ai' ? '#ede9fe' : '#fff',
                      color: startingPlayer === 'ai' ? '#7c3aed' : '#374151',
                      borderRadius: 6,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    AI Starts
                  </button>
                </div>
              </div>

              <button
                onClick={startDebate}
                disabled={isLoading || !topic.trim()}
                style={{
                  width: '100%',
                  padding: '15px',
                  backgroundColor: isLoading || !topic.trim() ? '#9ca3af' : '#1e40af',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '18px',
                  fontWeight: 700,
                  cursor: isLoading || !topic.trim() ? 'not-allowed' : 'pointer',
                  letterSpacing: 1
                }}
              >
                {isLoading ? 'STARTING DEBATE...' : 'START DEBATE'}
              </button>
            </div>

            {error && (
              <div style={{
                padding: '15px',
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: 6,
                color: '#dc2626',
                textAlign: 'center',
                fontWeight: 600
              }}>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Debate Interface
  if (session) {
    const rubric = getRubricForRound(session.currentRound);

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
          {/* Header - Full Width */}
          <div style={{ textAlign: 'center', marginBottom: '30px', width: '100%' }}>
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
              color: '#64748b',
              fontSize: '1.1rem',
              fontWeight: 500,
              margin: '0 0 15px 0'
            }}>
              Topic: <strong>{session.topic}</strong> | 
              Your Position: <strong style={{ color: session.userSide === 'pro' ? '#059669' : '#dc2626' }}>
                {session.userSide.toUpperCase()}
              </strong>
            </div>
            
            {/* Round Progress */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
              {[1, 2, 3, 4].map(round => (
                <div key={round} style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  backgroundColor: round === session.currentRound ? '#1e40af' : round < session.currentRound ? '#10b981' : '#e5e7eb',
                  color: round <= session.currentRound ? '#fff' : '#6b7280',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}>
                  {round}. {getRoundTitle(round)}
                </div>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div style={{ 
            display: 'flex', 
            gap: '30px', 
            flex: 1,
            alignItems: 'flex-start'
          }}>
            
            {/* Left side - Debate History + Current Input */}
            <div style={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0
            }}>
              
              {/* Debate History */}
              <div 
                ref={resultRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '20px',
                  marginBottom: '20px',
                  background: '#fafafa',
                  minHeight: '400px',
                  maxHeight: '600px'
                }}
              >
                {session.rounds.map((round, index) => (
                  <div key={index} style={{ marginBottom: '30px' }}>
                    {/* Round Header */}
                    <div style={{
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
                      color: '#fff',
                      padding: '15px 20px',
                      borderRadius: '8px 8px 0 0',
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      textAlign: 'center'
                    }}>
                      ROUND {index + 1}: {getRoundTitle(index + 1)}
                    </div>

                    {/* Round Content */}
                    <div style={{
                      border: '2px solid #1e40af',
                      borderTop: 'none',
                      borderRadius: '0 0 8px 8px',
                      overflow: 'hidden'
                    }}>
                      {/* Human Argument */}
                      {round.userResponse && (
                        <div style={{
                          background: '#dbeafe',
                          padding: '20px',
                          borderBottom: round.aiResponse ? '1px solid #93c5fd' : 'none'
                        }}>
                          <div style={{ 
                            fontWeight: 700, 
                            color: '#1e40af', 
                            marginBottom: '8px',
                            fontSize: '1rem'
                          }}>
                            YOU ({session.userSide.toUpperCase()}):
                          </div>
                          <div style={{ color: '#1e40af', lineHeight: 1.6 }}>
                            {round.userResponse}
                          </div>
                        </div>
                      )}

                      {/* AI Argument */}
                      {round.aiResponse && (
                        <div style={{
                          background: '#f3e8ff',
                          padding: '20px'
                        }}>
                          <div style={{ 
                            fontWeight: 700, 
                            color: '#7c3aed', 
                            marginBottom: '8px',
                            fontSize: '1rem'
                          }}>
                            AI ({session.userSide === 'pro' ? 'CON' : 'PRO'}):
                          </div>
                          <div style={{ color: '#7c3aed', lineHeight: 1.6 }}>
                            {round.aiResponse}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isWaitingForAI && (
                  <div style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: '#7c3aed',
                    fontStyle: 'italic'
                  }}>
                    AI is thinking... 🤔
                  </div>
                )}
              </div>

              {/* Current Input Area */}
              {!session.isComplete && (
                <div style={{
                  border: '2px solid #1e40af',
                  borderRadius: 8,
                  padding: '20px',
                  background: '#fff'
                }}>
                  <div style={{ 
                    marginBottom: '15px',
                    fontWeight: 700,
                    color: '#1e40af',
                    fontSize: '1.1rem'
                  }}>
                    ROUND {session.currentRound}: {getRoundTitle(session.currentRound)}
                  </div>
                  
                  <textarea
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    placeholder={`Enter your ${getRoundTitle(session.currentRound).toLowerCase()} argument...`}
                    disabled={isWaitingForAI}
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: '15px',
                      border: '2px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: '16px',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      backgroundColor: isWaitingForAI ? '#f9fafb' : '#fff'
                    }}
                  />
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginTop: '15px'
                  }}>
                    <button
                      onClick={newDebate}
                      style={{
                        padding: '12px 20px',
                        backgroundColor: '#6b7280',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      New Debate
                    </button>
                    
                    <button
                      onClick={submitArgument}
                      disabled={!currentInput.trim() || isWaitingForAI}
                      style={{
                        padding: '12px 25px',
                        backgroundColor: !currentInput.trim() || isWaitingForAI ? '#9ca3af' : '#1e40af',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 700,
                        cursor: !currentInput.trim() || isWaitingForAI ? 'not-allowed' : 'pointer',
                        fontSize: '16px'
                      }}
                    >
                      {isWaitingForAI ? 'Please wait...' : 'Submit Argument'}
                    </button>
                  </div>
                </div>
              )}

              {/* Completion message */}
              {session.isComplete && (
                <div style={{
                  textAlign: 'center',
                  padding: '30px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '1.2rem'
                }}>
                  🎉 Debate Complete! Great job working through all 4 rounds!
                  <br />
                  <button
                    onClick={newDebate}
                    style={{
                      marginTop: '15px',
                      padding: '12px 25px',
                      backgroundColor: '#fff',
                      color: '#059669',
                      border: 'none',
                      borderRadius: 6,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    Start New Debate
                  </button>
                </div>
              )}
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
              height: 'fit-content',
              borderRadius: 8
            }}>
              {session.isComplete && (session as any).finalGrading ? (
                <div>
                  <h3 style={{ 
                    margin: '0 0 20px 0', 
                    fontSize: '1.3rem', 
                    fontWeight: 700,
                    color: '#fbbf24',
                    textAlign: 'center'
                  }}>
                    🏆 FINAL GRADING
                  </h3>
                  
                  <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ 
                        background: 'rgba(251,191,36,0.2)', 
                        padding: '10px', 
                        borderRadius: 6, 
                        marginBottom: 8,
                        border: '1px solid #fbbf24'
                      }}>
                        <strong style={{ color: '#fbbf24' }}>
                          Constructive: {(session as any).finalGrading.constructive?.subtotal || 0}/30 (30%)
                        </strong>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ 
                        background: 'rgba(251,191,36,0.2)', 
                        padding: '10px', 
                        borderRadius: 6, 
                        marginBottom: 8,
                        border: '1px solid #fbbf24'
                      }}>
                        <strong style={{ color: '#fbbf24' }}>
                          Cross-Ex: {(session as any).finalGrading.crossEx?.subtotal || 0}/10 (10%)
                        </strong>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ 
                        background: 'rgba(251,191,36,0.2)', 
                        padding: '10px', 
                        borderRadius: 6, 
                        marginBottom: 8,
                        border: '1px solid #fbbf24'
                      }}>
                        <strong style={{ color: '#fbbf24' }}>
                          Rebuttal: {(session as any).finalGrading.rebuttal?.subtotal || 0}/35 (35%)
                        </strong>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ 
                        background: 'rgba(251,191,36,0.2)', 
                        padding: '10px', 
                        borderRadius: 6, 
                        marginBottom: 8,
                        border: '1px solid #fbbf24'
                      }}>
                        <strong style={{ color: '#fbbf24' }}>
                          Closing: {(session as any).finalGrading.closing?.subtotal || 0}/25 (25%)
                        </strong>
                      </div>
                    </div>
                    
                    <div style={{ 
                      background: 'rgba(34,197,94,0.2)', 
                      padding: '15px', 
                      borderRadius: 8, 
                      border: '2px solid #22c55e',
                      textAlign: 'center'
                    }}>
                      <strong style={{ color: '#22c55e', fontSize: '1.2rem' }}>
                        TOTAL SCORE: {(session as any).finalGrading.finalScore || 0}/100
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 style={{ 
                    margin: '0 0 10px 0', 
                    fontSize: '1.2rem', 
                    fontWeight: 700,
                    color: '#fbbf24',
                    textAlign: 'center'
                  }}>
                    ROUND {session.currentRound}: {rubric.title}
                  </h3>
                  
                  <p style={{ 
                    margin: '0 0 20px 0', 
                    fontSize: '1rem', 
                    fontWeight: 700,
                    color: '#fbbf24',
                    textAlign: 'center'
                  }}>
                    Total: {rubric.totalPoints} Points ({rubric.weight}% of final grade)
                  </p>
                  
                  <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {rubric.criteria.map((criterion, index) => (
                      <div key={index} style={{ marginBottom: '20px' }}>
                        <div style={{ 
                          background: 'rgba(251,191,36,0.2)', 
                          padding: '10px', 
                          borderRadius: 6, 
                          marginBottom: 10,
                          border: '1px solid #fbbf24'
                        }}>
                          <strong style={{ color: '#fbbf24' }}>
                            {criterion.name} ({criterion.points})
                          </strong>
                        </div>
                        <div style={{ paddingLeft: '10px', marginBottom: '12px' }}>
                          {criterion.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
