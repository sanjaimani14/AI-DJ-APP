import React, { useState, useEffect } from 'react';
import { 
  SafetyLogger, 
  type SafetyLogEntry, 
  type SessionEventItem, 
  type LogSeverity 
} from '../services/safetyLogger';
import { 
  FileText, 
  Download, 
  X, 
  CheckCircle, 
  Zap, 
  Cpu, 
  Activity,
  Bug
} from 'lucide-react';

interface EventSessionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateCorruptTrack?: () => void;
  onSimulatePlannerFailure?: () => void;
  onSimulateTransitionGlitch?: () => void;
  onSimulateDeckStall?: () => void;
}

export const EventSessionLogModal: React.FC<EventSessionLogModalProps> = ({
  isOpen,
  onClose,
  onSimulateCorruptTrack,
  onSimulatePlannerFailure,
  onSimulateTransitionGlitch,
  onSimulateDeckStall
}) => {
  const [activeTab, setActiveTab] = useState<'session' | 'diagnostics' | 'simulation'>('session');
  const [sessionEvents, setSessionEvents] = useState<SessionEventItem[]>(() => SafetyLogger.getSessionEvents());
  const [safetyLogs, setSafetyLogs] = useState<SafetyLogEntry[]>(() => SafetyLogger.getLogs());
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  useEffect(() => {
    if (!isOpen) return;

    // Refresh logs on open & subscribe
    setSessionEvents(SafetyLogger.getSessionEvents());
    setSafetyLogs(SafetyLogger.getLogs());

    const unsubLogs = SafetyLogger.subscribeLogs(() => {
      setSafetyLogs(SafetyLogger.getLogs());
    });
    const unsubEvents = SafetyLogger.subscribeEvents(() => {
      setSessionEvents(SafetyLogger.getSessionEvents());
    });

    return () => {
      unsubLogs();
      unsubEvents();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    const jsonStr = SafetyLogger.exportAsJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dj-session-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportTXT = () => {
    const textStr = SafetyLogger.exportAsText();
    const blob = new Blob([textStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dj-session-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityBadge = (sev: LogSeverity) => {
    switch (sev) {
      case 'CRITICAL_RECOVERY':
        return { bg: 'rgba(255, 23, 68, 0.25)', color: '#ff1744', border: '1px solid #ff1744' };
      case 'ERROR':
        return { bg: 'rgba(255, 82, 82, 0.2)', color: '#ff5252', border: '1px solid #ff5252' };
      case 'WARN':
        return { bg: 'rgba(255, 145, 0, 0.2)', color: '#ff9100', border: '1px solid #ff9100' };
      case 'INFO':
      default:
        return { bg: 'rgba(0, 229, 255, 0.15)', color: '#00e5ff', border: '1px solid #00e5ff' };
    }
  };

  const filteredLogs = safetyLogs.filter((log) => {
    if (severityFilter === 'ALL') return true;
    return log.severity === severityFilter;
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(2, 4, 8, 0.88)',
      backdropFilter: 'blur(8px)',
      zIndex: 10002,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '880px',
          height: '84vh',
          borderRadius: '16px',
          border: '1px solid var(--border-medium)',
          background: 'linear-gradient(180deg, #0e1422 0%, #080c14 100%)',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.8), 0 0 35px rgba(0, 229, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '16px 22px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--deck-a-primary) 0%, #0088cc 100%)',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 900, color: '#fff', margin: 0 }}>
                PHASE 11 — EVENT SESSION LOG & SAFETY DIAGNOSTICS
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Audit trail • Automated Fault Recovery • Zero-Silence Fallbacks
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleExportJSON}
              className="dj-btn"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--deck-a-primary)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
              title="Download entire log audit trail as JSON"
            >
              <Download size={13} /> EXPORT JSON
            </button>

            <button
              onClick={handleExportTXT}
              className="dj-btn"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
              title="Download report as plain text"
            >
              <Download size={13} /> EXPORT TXT
            </button>

            <button
              onClick={onClose}
              className="dj-btn"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '6px',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(5, 8, 14, 0.8)',
          padding: '0 22px'
        }}>
          <button
            onClick={() => setActiveTab('session')}
            style={{
              padding: '12px 18px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'session' ? '2px solid var(--deck-a-primary)' : '2px solid transparent',
              color: activeTab === 'session' ? 'var(--deck-a-primary)' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            CHRONOLOGICAL EVENT LOG ({sessionEvents.length})
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            style={{
              padding: '12px 18px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'diagnostics' ? '2px solid var(--ai-primary)' : '2px solid transparent',
              color: activeTab === 'diagnostics' ? 'var(--ai-primary)' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            SAFETY & FAULT DIAGNOSTICS ({safetyLogs.length})
          </button>

          <button
            onClick={() => setActiveTab('simulation')}
            style={{
              padding: '12px 18px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'simulation' ? '2px solid #ff9100' : '2px solid transparent',
              color: activeTab === 'simulation' ? '#ff9100' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            INTENTIONAL FAULT SIMULATION TEST
          </button>
        </div>

        {/* Tab 1: Chronological Event Session Log */}
        {activeTab === 'session' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>
            {sessionEvents.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No session events recorded yet. Start playback or execute a transition to begin tracking.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sessionEvents.map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)'
                      }}>
                        {evt.timeFormatted}
                      </span>

                      <span style={{
                        fontSize: '9px',
                        fontWeight: 900,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: evt.type.includes('FALLBACK') || evt.type.includes('EMERGENCY')
                          ? 'rgba(255, 23, 68, 0.2)'
                          : 'rgba(0, 229, 255, 0.15)',
                        color: evt.type.includes('FALLBACK') || evt.type.includes('EMERGENCY')
                          ? '#ff3344'
                          : 'var(--deck-a-primary)'
                      }}>
                        {evt.type}
                      </span>

                      <span style={{ fontWeight: 700, color: '#fff' }}>
                        {evt.description}
                      </span>
                    </div>

                    {evt.deckId && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        color: evt.deckId === 'A' ? 'var(--deck-a-primary)' : 'var(--deck-b-primary)'
                      }}>
                        DECK {evt.deckId}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Safety & Fault Diagnostics */}
        {activeTab === 'diagnostics' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Filter Bar */}
            <div style={{
              padding: '10px 22px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(0,0,0,0.2)'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>FILTER SEVERITY:</span>
              {['ALL', 'CRITICAL_RECOVERY', 'ERROR', 'WARN', 'INFO'].map((f) => (
                <button
                  key={f}
                  onClick={() => setSeverityFilter(f)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 800,
                    background: severityFilter === f ? 'var(--ai-primary)' : 'rgba(255,255,255,0.05)',
                    color: severityFilter === f ? '#000' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Logs List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredLogs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No diagnostics matching current filter. All safety systems nominal.
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const badge = getSeverityBadge(log.severity);
                  return (
                    <div
                      key={log.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            {log.timeFormatted}
                          </span>

                          <span style={{
                            fontSize: '9px',
                            fontWeight: 900,
                            padding: '2px 6px',
                            borderRadius: '3px',
                            background: badge.bg,
                            color: badge.color,
                            border: badge.border
                          }}>
                            {log.severity}
                          </span>

                          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                            [{log.category}]
                          </span>

                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                            {log.message}
                          </span>
                        </div>
                      </div>

                      {log.recoveryActionTaken && (
                        <div style={{
                          fontSize: '11px',
                          color: '#00ff88',
                          paddingLeft: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <CheckCircle size={12} />
                          <strong>Auto-Recovery Action:</strong> {log.recoveryActionTaken}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Intentional Fault Simulation Test Suite */}
        {activeTab === 'simulation' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Verify system resilience by intentionally injecting critical live event failures. 
              The application must isolate the error, activate the fallback, and guarantee continuous audio without silence.
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '14px'
            }}>
              {/* FAULT 1: Corrupt / Invalid Track */}
              <div style={{
                background: 'rgba(5, 8, 14, 0.85)',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff5252', fontWeight: 900, fontSize: '13px' }}>
                    <Bug size={16} /> 1. CORRUPT TRACK SIMULATION
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Simulates a corrupt, missing (404), or undecodable audio file.
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <strong>Expected Behavior:</strong> Engine catches decode error, auto-skips broken track, logs failure, and loads next healthy candidate without stalling.
                </div>

                <button
                  onClick={onSimulateCorruptTrack}
                  className="dj-btn"
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    background: 'rgba(255, 82, 82, 0.15)',
                    border: '1px solid #ff5252',
                    color: '#ff5252',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  TRIGGER CORRUPT TRACK TEST
                </button>
              </div>

              {/* FAULT 2: AI Planner Failure / Crash */}
              <div style={{
                background: 'rgba(5, 8, 14, 0.85)',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff9100', fontWeight: 900, fontSize: '13px' }}>
                    <Cpu size={16} /> 2. AI PLANNER CRASH SIMULATION
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Simulates AI planner throwing an unexpected exception or API timeout.
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <strong>Expected Behavior:</strong> Swapped instantly to local rule-based fallback decision; structured JSON returned; music continues uninterrupted.
                </div>

                <button
                  onClick={onSimulatePlannerFailure}
                  className="dj-btn"
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    background: 'rgba(255, 145, 0, 0.15)',
                    border: '1px solid #ff9100',
                    color: '#ff9100',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  TRIGGER PLANNER CRASH TEST
                </button>
              </div>

              {/* FAULT 3: Transition Engine Glitch */}
              <div style={{
                background: 'rgba(5, 8, 14, 0.85)',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00e5ff', fontWeight: 900, fontSize: '13px' }}>
                    <Zap size={16} /> 3. UNAVAILABLE TRANSITION
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Simulates failure during advanced EQ/filter sweeps.
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <strong>Expected Behavior:</strong> Instantly resets DSP filters to neutral and completes transition via standard equal-power crossfade.
                </div>

                <button
                  onClick={onSimulateTransitionGlitch}
                  className="dj-btn"
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    background: 'rgba(0, 229, 255, 0.15)',
                    border: '1px solid #00e5ff',
                    color: '#00e5ff',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  TRIGGER TRANSITION FALLBACK TEST
                </button>
              </div>

              {/* FAULT 4: Deck Playback Freeze / Stall */}
              <div style={{
                background: 'rgba(5, 8, 14, 0.85)',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ai-primary)', fontWeight: 900, fontSize: '13px' }}>
                    <Activity size={16} /> 4. DECK STALL DETECTION
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Simulates active audio channel freeze or buffer deadlock.
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <strong>Expected Behavior:</strong> Watchdog detects freeze, logs critical recovery, and engages automatic deck recovery / transition.
                </div>

                <button
                  onClick={onSimulateDeckStall}
                  className="dj-btn"
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    background: 'rgba(0, 255, 136, 0.15)',
                    border: '1px solid var(--ai-primary)',
                    color: 'var(--ai-primary)',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  TRIGGER DECK STALL RECOVERY TEST
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
