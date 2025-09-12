import React, { useState, useRef, useEffect } from 'react';
import { DebateSession, DebateRound } from '../../lib/types';

const App: React.FC = () => {
  const [session, setSession] = useState<DebateSession | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [isWaitingForAI, setIsWaitingForAI] = useState<boolean>(false);
  const [isValidatingTopic, setIsValidatingTopic] = useState<boolean>(false);
  const [topicValidation, setTopicValidation] = useState<{ valid: boolean; reason: string; refinedTopic?: string; suggestedRewrite?: string } | null>(null);
  const [showRubric, setShowRubric] = useState<boolean>(false);
  const [isValidatorReady, setIsValidatorReady] = useState<boolean>(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest round
  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [session]);

  // Pre-load validator when user focuses on topic input
  const prepareValidator = async () => {
    if (isValidatorReady) return;
    
    try {
      const response = await fetch('/api/prepare-validator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        setIsValidatorReady(true);
      }
    } catch (error) {
      console.log('Failed to prepare validator, will work normally');
    }
  };

  const validateTopic = async (topicToValidate: string) => {
    setIsValidatingTopic(true);
    setTopicValidation(null);
    
    try {
      const response = await fetch('/api/validate-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicToValidate })
      });
      
      const result = await response.json();
      setTopicValidation(result);
      
      if (result.valid && result.refinedTopic) {
        setTopic(result.refinedTopic);
      }
      
      return result.valid;
    } catch (error) {
      setTopicValidation({ 
        valid: false, 
        reason: 'Error validating topic. Please try again.' 
      });
      return false;
    } finally {
      setIsValidatingTopic(false);
    }
  };

  const startDebate = async () => {
    if (!topic.trim()) {
      setError('Please enter a debate topic');
      return;
    }

    // Validate topic first
    const isValid = await validateTopic(topic.trim());
    if (!isValid) {
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/start-debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), position: 'for', startingPlayer: 'human' })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setSession(data.session);
      setCurrentInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start debate');
    } finally {
      setIsLoading(false);
    }
  };

  const submitArgument = async () => {
    if (!session || !currentInput.trim() || isWaitingForAI) return;
    
    const userArgument = currentInput.trim();
    
    // Optimistic UI update - immediately add user response to avoid flickering
    const optimisticSession = {
      ...session,
      rounds: session.rounds.map((round, idx) => {
        if (idx === session.currentRound - 1) {
          return {
            ...round,
            userResponse: userArgument
          };
        }
        return round;
      })
    };
    
    // Update UI immediately
    setSession(optimisticSession);
    setCurrentInput('');
    setIsWaitingForAI(true);
    
    try {
      const response = await fetch('/api/submit-argument', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          argument: userArgument
        })
      });
      
      if (!response.ok) {
        // Revert optimistic update on error
        setSession(session);
        setCurrentInput(userArgument);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // Update with server response (should be same as optimistic, but with AI response if available)
      setSession(data.session);
      
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
    setTopicValidation(null);
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

  const getAllRubrics = () => {
    return {
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
  };

  const RubricComponent = () => (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 1000
    }}>
      <button
        onClick={() => setShowRubric(!showRubric)}
        style={{
          padding: '12px 24px',
          backgroundColor: '#1e3a8a',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '16px',
          boxShadow: '0 4px 12px rgba(30,58,138,0.3)'
        }}
      >
        {showRubric ? 'Hide Rubric' : 'Show Rubric'}
      </button>
      
      {showRubric && (
        <div style={{
          position: 'absolute',
          top: '60px',
          right: '0',
          width: '400px',
          maxHeight: '80vh',
          backgroundColor: '#fff',
          border: '2px solid #1e3a8a',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          overflow: 'auto',
          padding: '20px'
        }}>
          <h3 style={{ 
            color: '#1e3a8a', 
            marginBottom: '20px', 
            textAlign: 'center',
            borderBottom: '2px solid #fbbf24',
            paddingBottom: '10px'
          }}>
            DEBATE RUBRICS
          </h3>
          
          {Object.entries(getAllRubrics()).map(([roundNum, rubric]) => (
            <div key={roundNum} style={{ marginBottom: '25px' }}>
              <h4 style={{ 
                color: '#fbbf24', 
                marginBottom: '10px',
                fontSize: '16px',
                fontWeight: 700
              }}>
                ROUND {roundNum}: {rubric.title} ({rubric.totalPoints} pts, {rubric.weight}% weight)
              </h4>
              
              {rubric.criteria.map((criterion, idx) => (
                <div key={idx} style={{ 
                  marginBottom: '8px',
                  paddingLeft: '15px',
                  borderLeft: '3px solid #e2e8f0'
                }}>
                  <div style={{ fontWeight: 600, color: '#374151' }}>
                    {criterion.name} ({criterion.points})
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {criterion.description}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Setup/Topic Selection Screen
  if (!session) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(120deg, #1e3a8a 0%, #3730a3 50%, #1e40af 100%)',
        padding: 0,
        fontFamily: 'Segoe UI, Arial, sans-serif'
      }}>
        <RubricComponent />
        
        <div style={{
          maxWidth: 1200,
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

          <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
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
                  onFocus={prepareValidator}
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
                
                {/* Topic validation feedback */}
                {topicValidation && !topicValidation.valid && (
                  <div style={{
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fca5a5',
                    borderRadius: '6px',
                    color: '#dc2626'
                  }}>
                    {topicValidation.reason}
                    {topicValidation.suggestedRewrite && (
                      <div style={{ marginTop: '8px', fontStyle: 'italic' }}>
                        Try: "{topicValidation.suggestedRewrite}"
                      </div>
                    )}
                  </div>
                )}
                
                {topicValidation && topicValidation.valid && (
                  <div style={{
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#d1fae5',
                    border: '1px solid #a7f3d0',
                    borderRadius: '6px',
                    color: '#059669'
                  }}>
                    ✓ Topic validated successfully!
                  </div>
                )}
              </div>

              <button
                onClick={startDebate}
                disabled={isLoading || isValidatingTopic || !topic.trim()}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: isLoading || isValidatingTopic ? '#9ca3af' : '#1e3a8a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '18px',
                  fontWeight: 600,
                  cursor: isLoading || isValidatingTopic ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(30,58,138,0.3)'
                }}
              >
                {isValidatingTopic ? 'Validating Topic...' : isLoading ? 'Starting Debate...' : 'Start Debate'}
              </button>

              {error && (
                <div style={{
                  marginTop: '20px',
                  padding: '12px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: 6,
                  color: '#dc2626',
                  textAlign: 'center'
                }}>
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Debate Interface
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(120deg, #1e3a8a 0%, #3730a3 50%, #1e40af 100%)',
      fontFamily: 'Segoe UI, Arial, sans-serif'
    }}>
      <RubricComponent />
      
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '20px',
        background: '#fff',
        minHeight: '100vh',
        boxShadow: '0 0 40px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          padding: '20px 0',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px'
        }}>
          <h1 style={{
            color: '#1e3a8a',
            fontSize: '2rem',
            margin: '0 0 10px 0',
            fontWeight: 700
          }}>
            DebateAI Training Session
          </h1>
          <p style={{
            color: '#64748b',
            fontSize: '16px',
            margin: '0 0 10px 0'
          }}>
            Topic: "{session.topic}"
          </p>
          <p style={{
            color: '#64748b',
            fontSize: '14px',
            margin: 0
          }}>
            You are arguing <strong style={{ color: '#0ea5e9' }}>
              FOR
            </strong> this topic
          </p>
          
          <button
            onClick={newDebate}
            style={{
              marginTop: '15px',
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            New Debate
          </button>
        </div>

        {/* Side-by-side debate layout - Always show both sides */}
        <div style={{
          flex: 1,
          minHeight: '600px'
        }}>
          {/* Display rounds with side-by-side responses */}
          {session.rounds.map((round, idx) => (
            <div key={idx} style={{
              display: 'flex',
              gap: '20px',
              marginBottom: '20px',
              minHeight: '120px'
            }}>
              {/* Pro side response */}
              <div style={{
                flex: 1,
                backgroundColor: '#f0f9ff',
                border: '2px solid #0ea5e9',
                borderRadius: '12px',
                padding: '15px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  color: '#0ea5e9',
                  fontWeight: 700,
                  marginBottom: '12px',
                  fontSize: '14px',
                  textAlign: 'center',
                  borderBottom: '1px solid #0ea5e9',
                  paddingBottom: '6px'
                }}>
                  PRO - {getRoundTitle(idx + 1)}
                </div>
                
                {(() => {
                  // User is always PRO, so PRO response is always user response
                  const proResponse = round.userResponse;
                  const proPlayer = 'You';
                  
                  return proResponse ? (
                    <div style={{
                      backgroundColor: '#fff',
                      border: '1px solid #bae6fd',
                      borderRadius: '8px',
                      padding: '12px',
                      lineHeight: 1.6,
                      color: '#374151',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        color: '#0ea5e9',
                        fontWeight: 600,
                        marginBottom: '6px'
                      }}>
                        {proPlayer}
                      </div>
                      <div style={{ flex: 1 }}>
                        {proResponse}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      backgroundColor: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontStyle: 'italic',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      Waiting for your response...
                    </div>
                  );
                })()}
              </div>

              {/* Con side response */}
              <div style={{
                flex: 1,
                backgroundColor: '#f8fafc',
                border: '2px solid #64748b',
                borderRadius: '12px',
                padding: '15px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  color: '#64748b',
                  fontWeight: 700,
                  marginBottom: '12px',
                  fontSize: '14px',
                  textAlign: 'center',
                  borderBottom: '1px solid #64748b',
                  paddingBottom: '6px'
                }}>
                  CON - {getRoundTitle(idx + 1)}
                </div>
                
                {(() => {
                  // User is always PRO, so CON response is always AI response
                  const conResponse = round.aiResponse;
                  const conPlayer = 'AI';
                  
                  return conResponse ? (
                    <div style={{
                      backgroundColor: '#fff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '12px',
                      lineHeight: 1.6,
                      color: '#374151',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        color: '#64748b',
                        fontWeight: 600,
                        marginBottom: '6px'
                      }}>
                        {conPlayer}
                      </div>
                      <div style={{ flex: 1 }}>
                        {conResponse}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      backgroundColor: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontStyle: 'italic',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      Waiting for AI response...
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}

          {/* Current round input - appears in the exact position where the response will show */}
          {!session.isComplete && (
            <div style={{
              display: 'flex',
              gap: '20px',
              marginBottom: '20px',
              minHeight: '120px'
            }}>
              {/* Pro side - input or placeholder */}
              <div style={{
                flex: 1,
                backgroundColor: '#f0f9ff',
                border: '2px solid #0ea5e9',
                borderRadius: '12px',
                padding: '15px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  color: '#0ea5e9',
                  fontWeight: 700,
                  marginBottom: '12px',
                  fontSize: '14px',
                  textAlign: 'center',
                  borderBottom: '1px solid #0ea5e9',
                  paddingBottom: '6px'
                }}>
                  PRO - {getRoundTitle(session.currentRound)}
                </div>
                
                {/* User is always PRO */}
                {(() => {
                  const currentRound = session.rounds[session.currentRound - 1];
                  return currentRound?.userResponse ? (
                      // Show submitted response
                      <div style={{
                        backgroundColor: '#fff',
                        border: '1px solid #bae6fd',
                        borderRadius: '8px',
                        padding: '12px',
                        lineHeight: 1.6,
                        color: '#374151',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <div style={{
                          fontSize: '11px',
                          color: '#0ea5e9',
                          fontWeight: 600,
                          marginBottom: '6px'
                        }}>
                          You
                        </div>
                        <div style={{ flex: 1 }}>
                          {currentRound.userResponse}
                        </div>
                      </div>
                    ) : !isWaitingForAI ? (
                      // Show input
                      <div style={{
                        backgroundColor: '#fff',
                        border: '2px solid #0ea5e9',
                        borderRadius: '8px',
                        padding: '12px',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <div style={{
                          fontSize: '11px',
                          color: '#0ea5e9',
                          fontWeight: 600,
                          marginBottom: '6px'
                        }}>
                          Your Turn
                        </div>
                        
                        <textarea
                          value={currentInput}
                          onChange={(e) => setCurrentInput(e.target.value)}
                          placeholder={`Enter your ${getRoundTitle(session.currentRound).toLowerCase()} argument...`}
                          style={{
                            width: '100%',
                            minHeight: '80px',
                            padding: '8px',
                            borderRadius: 4,
                            border: '1px solid #d1d5db',
                            fontSize: '14px',
                            lineHeight: 1.5,
                            resize: 'vertical',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                            flex: 1
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              submitArgument();
                            }
                          }}
                        />
                        
                        <div style={{
                          marginTop: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            Ctrl+Enter to submit
                          </div>
                          
                          <button
                            onClick={submitArgument}
                            disabled={!currentInput.trim()}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: currentInput.trim() ? '#0ea5e9' : '#9ca3af',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              cursor: currentInput.trim() ? 'pointer' : 'not-allowed',
                              fontWeight: 600,
                              fontSize: '12px'
                            }}
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Show waiting state
                      <div style={{
                        backgroundColor: '#f8fafc',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '8px',
                        padding: '12px',
                        textAlign: 'center',
                        color: '#6b7280',
                        fontStyle: 'italic',
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        Processing your response...
                      </div>
                    );
                  })()}
              </div>

              {/* Con side - input or placeholder */}
              <div style={{
                flex: 1,
                backgroundColor: '#f8fafc',
                border: '2px solid #64748b',
                borderRadius: '12px',
                padding: '15px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  color: '#64748b',
                  fontWeight: 700,
                  marginBottom: '12px',
                  fontSize: '14px',
                  textAlign: 'center',
                  borderBottom: '1px solid #64748b',
                  paddingBottom: '6px'
                }}>
                  CON - {getRoundTitle(session.currentRound)}
                </div>
                
                {/* AI is always CON - show waiting for response */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                  color: '#6b7280',
                  fontStyle: 'italic',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  Waiting for your response...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status messages for waiting/complete states */}
        {session.isComplete ? (
          <div style={{
            marginTop: '20px',
            textAlign: 'center',
            padding: '20px',
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            border: '2px solid #f59e0b'
          }}>
            <h3 style={{ color: '#92400e', margin: '0 0 10px 0' }}>
              🎉 Debate Complete!
            </h3>
            <p style={{ color: '#92400e', margin: '0 0 15px 0' }}>
              Great job completing all {session.rounds.length} rounds of debate!
            </p>
            <button
              onClick={newDebate}
              style={{
                padding: '12px 24px',
                backgroundColor: '#1e3a8a',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '16px'
              }}
            >
              Start New Debate
            </button>
          </div>
        ) : isWaitingForAI ? (
          <div style={{
            marginTop: '20px',
            textAlign: 'center',
            padding: '20px',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>
              🤖 AI is preparing response...
            </div>
            <div style={{ fontSize: '14px' }}>
              Round {session.currentRound}: {getRoundTitle(session.currentRound)}
            </div>
          </div>
        ) : null}

        {error && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: 8,
            color: '#dc2626',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
