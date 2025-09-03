/**
 * User session management utility
 * Provides session handling capabilities for user authentication
 */

/**
 * Creates a new user session
 * @param {string} userId - The user identifier
 * @param {Object} userData - User data to store in session
 * @returns {Object} Session object with token and metadata
 */
export function createSession(userId, userData = {}) {
  if (!userId) {
    throw new Error('User ID is required to create a session');
  }
  
  return {
    id: `session_${Date.now()}_${userId}`,
    userId,
    userData,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    active: true
  };
}

/**
 * Validates a session token
 * @param {string} token - Session token to validate
 * @returns {boolean} True if session is valid
 */
export function validateSession(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Simple validation - in real implementation would check against store
  return token.startsWith('session_') && token.length > 20;
}

/**
 * Updates session activity timestamp
 * @param {Object} session - Session object to update
 * @returns {Object} Updated session object
 */
export function updateSessionActivity(session) {
  if (!session || !session.id) {
    throw new Error('Valid session object is required');
  }
  
  return {
    ...session,
    lastActivity: new Date().toISOString()
  };
}

export default {
  createSession,
  validateSession,
  updateSessionActivity
};