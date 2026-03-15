/**
 * Audit logging utilities for tracking sensitive configuration changes.
 * 
 * Currently logs to console for debugging. In production, this should
 * send events to a backend audit service.
 */

export interface AuditEvent {
  /** The type of action performed */
  action: string;
  /** The assistant ID being modified */
  assistantId: string;
  /** The specific changes made */
  changes: Record<string, unknown>;
  /** Optional user ID performing the action */
  userId?: string;
  /** ISO 8601 timestamp of the event */
  timestamp: string;
  /** Optional additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Logs an audit event to the console and potentially to a backend service.
 * 
 * @param event - The audit event to log
 */
export function logAuditEvent(event: AuditEvent): void {
  const logEntry = {
    type: "AUDIT",
    ...event,
  };

  // Log to console for debugging and development
  // In production, this should be sent to a backend audit service
  console.log("[AUDIT]", JSON.stringify(logEntry, null, 2));

  // TODO: Send to backend audit service when available
  // Example: await fetch('/api/audit', { method: 'POST', body: JSON.stringify(event) })
}

/**
 * Creates a standardized audit event for assistant configuration updates.
 * 
 * @param assistantId - The assistant being modified
 * @param changes - The configuration changes being made
 * @param userId - Optional user ID performing the change
 * @returns A standardized audit event object
 */
export function createAssistantConfigAuditEvent(
  assistantId: string,
  changes: Record<string, unknown>,
  userId?: string
): AuditEvent {
  return {
    action: "assistant_config_update",
    assistantId,
    changes,
    userId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates a standardized audit event for auth mode changes specifically.
 * 
 * @param assistantId - The assistant being modified
 * @param oldAuthMode - The previous auth mode
 * @param newAuthMode - The new auth mode
 * @param userId - Optional user ID performing the change
 * @returns A standardized audit event object
 */
export function createAuthModeChangeAuditEvent(
  assistantId: string,
  oldAuthMode: string | undefined,
  newAuthMode: string,
  userId?: string
): AuditEvent {
  return {
    action: "auth_mode_change",
    assistantId,
    changes: {
      field: "authMode",
      oldValue: oldAuthMode,
      newValue: newAuthMode,
    },
    userId,
    timestamp: new Date().toISOString(),
    metadata: {
      severity: newAuthMode === "auto" ? "high" : "normal",
      reason: newAuthMode === "auto" ? "Switching to Auto mode bypasses all safety approvals" : undefined,
    },
  };
}
