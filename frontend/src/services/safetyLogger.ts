/**
 * frontend/src/services/safetyLogger.ts - Live Event Safety, Error Logging & Session Event Log
 * Phase 11: Fail-safe logging and audit trail for live DJ sets.
 */

export type LogSeverity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL_RECOVERY';

export type LogCategory = 
  | 'NETWORK' 
  | 'AI_PLANNER' 
  | 'DECODER' 
  | 'TRANSITION' 
  | 'DECK_RECOVERY' 
  | 'AUDIO_DSP' 
  | 'VOLUME' 
  | 'SYSTEM';

export interface SafetyLogEntry {
  id: string;
  timestamp: number; // Unix ms
  timeFormatted: string;
  category: LogCategory;
  severity: LogSeverity;
  message: string;
  recoveryActionTaken?: string;
  details?: Record<string, unknown> | string;
}

export interface SessionEventItem {
  id: string;
  timestamp: number;
  timeFormatted: string;
  type: 
    | 'SET_STARTED' 
    | 'TRACK_PLAYING' 
    | 'TRANSITION_PLANNED' 
    | 'TRANSITION_EXECUTED' 
    | 'SAFE_FALLBACK_TRIGGERED' 
    | 'TRACK_RECOVERED' 
    | 'DECK_RECOVERED' 
    | 'EMERGENCY_STOP' 
    | 'VOLUME_CHANGED'
    | 'FAULT_SIMULATED';
  description: string;
  deckId?: 'A' | 'B';
  trackTitle?: string;
}

export type SafetyLogListener = (entry: SafetyLogEntry) => void;
export type SessionLogListener = (event: SessionEventItem) => void;

export class SafetyLogger {
  private static logs: SafetyLogEntry[] = [];
  private static sessionEvents: SessionEventItem[] = [];
  private static maxLogs = 300;
  private static logListeners: Set<SafetyLogListener> = new Set();
  private static eventListeners: Set<SessionLogListener> = new Set();

  private static formatTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${date.getMilliseconds().toString().padStart(3, '0')}`;
  }

  /**
   * Log a safety or system diagnostic entry.
   */
  public static log(
    category: LogCategory,
    severity: LogSeverity,
    message: string,
    recoveryActionTaken?: string,
    details?: Record<string, unknown> | string
  ): SafetyLogEntry {
    const now = new Date();
    const entry: SafetyLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now.getTime(),
      timeFormatted: this.formatTime(now),
      category,
      severity,
      message,
      recoveryActionTaken,
      details
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    if (severity === 'ERROR' || severity === 'CRITICAL_RECOVERY') {
      console.error(`[SAFETY LOGGER - ${severity}] [${category}] ${message}`, recoveryActionTaken ? `➔ Action: ${recoveryActionTaken}` : '');
    } else if (severity === 'WARN') {
      console.warn(`[SAFETY LOGGER - WARN] [${category}] ${message}`, recoveryActionTaken ? `➔ Action: ${recoveryActionTaken}` : '');
    } else {
      console.log(`[SAFETY LOGGER - INFO] [${category}] ${message}`);
    }

    this.notifyLogListeners(entry);
    return entry;
  }

  /**
   * Record a milestone in the Live Event Session Log.
   */
  public static recordSessionEvent(
    type: SessionEventItem['type'],
    description: string,
    deckId?: 'A' | 'B',
    trackTitle?: string
  ): SessionEventItem {
    const now = new Date();
    const event: SessionEventItem = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now.getTime(),
      timeFormatted: this.formatTime(now),
      type,
      description,
      deckId,
      trackTitle
    };

    this.sessionEvents.unshift(event);
    if (this.sessionEvents.length > this.maxLogs) {
      this.sessionEvents.pop();
    }

    this.notifyEventListeners(event);
    return event;
  }

  public static getLogs(): SafetyLogEntry[] {
    return [...this.logs];
  }

  public static getSessionEvents(): SessionEventItem[] {
    return [...this.sessionEvents];
  }

  public static clear(): void {
    this.logs = [];
    this.sessionEvents = [];
  }

  public static subscribeLogs(listener: SafetyLogListener): () => void {
    this.logListeners.add(listener);
    return () => this.logListeners.delete(listener);
  }

  public static subscribeEvents(listener: SessionLogListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private static notifyLogListeners(entry: SafetyLogEntry): void {
    for (const l of this.logListeners) {
      try { l(entry); } catch (err) { console.error('Error in log listener:', err); }
    }
  }

  private static notifyEventListeners(event: SessionEventItem): void {
    for (const l of this.eventListeners) {
      try { l(event); } catch (err) { console.error('Error in event listener:', err); }
    }
  }

  /**
   * Export the entire session log & safety diagnostics as JSON string.
   */
  public static exportAsJSON(): string {
    return JSON.stringify({
      exportTimestamp: new Date().toISOString(),
      totalEvents: this.sessionEvents.length,
      totalSafetyLogs: this.logs.length,
      sessionEvents: this.sessionEvents,
      safetyLogs: this.logs
    }, null, 2);
  }

  /**
   * Export the session log as human-readable plain text.
   */
  public static exportAsText(): string {
    const lines: string[] = [];
    lines.push('================================================================');
    lines.push('AI DJ AUTONOMOUS LIVE EVENT SESSION LOG & SAFETY REPORT');
    lines.push(`Exported at: ${new Date().toLocaleString()}`);
    lines.push('================================================================\n');

    lines.push('--- CHRONOLOGICAL EVENT SESSION LOG ---');
    for (const evt of [...this.sessionEvents].reverse()) {
      lines.push(`[${evt.timeFormatted}] [${evt.type}] ${evt.deckId ? `(Deck ${evt.deckId}) ` : ''}${evt.description}`);
    }

    lines.push('\n--- SAFETY DIAGNOSTICS & RECOVERY LOG ---');
    for (const log of [...this.logs].reverse()) {
      lines.push(`[${log.timeFormatted}] [${log.severity}] [${log.category}] ${log.message}`);
      if (log.recoveryActionTaken) {
        lines.push(`   └─ Recovery Action: ${log.recoveryActionTaken}`);
      }
    }

    return lines.join('\n');
  }
}
