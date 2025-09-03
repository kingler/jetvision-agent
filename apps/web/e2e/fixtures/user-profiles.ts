export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'demo';
  preferences: {
    defaultView: string;
    notifications: boolean;
    theme: 'light' | 'dark';
  };
  permissions: string[];
  metadata?: Record<string, any>;
}

export const testUsers: TestUser[] = [
  {
    id: 'admin-user-1',
    email: 'admin@jetvision-test.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    preferences: {
      defaultView: 'dashboard',
      notifications: true,
      theme: 'light'
    },
    permissions: [
      'apollo:read',
      'apollo:write',
      'avinode:read',
      'avinode:write',
      'system:admin',
      'n8n:manage'
    ],
    metadata: {
      company: 'JetVision',
      department: 'Admin',
      lastLogin: '2024-09-01T10:00:00Z'
    }
  },
  {
    id: 'sales-user-1',
    email: 'sales@jetvision-test.com',
    firstName: 'Sales',
    lastName: 'Representative',
    role: 'user',
    preferences: {
      defaultView: 'leads',
      notifications: true,
      theme: 'light'
    },
    permissions: [
      'apollo:read',
      'apollo:write',
      'avinode:read'
    ],
    metadata: {
      company: 'JetVision',
      department: 'Sales',
      quota: 1000000,
      territory: 'North America'
    }
  },
  {
    id: 'charter-ops-1',
    email: 'ops@jetvision-test.com',
    firstName: 'Charter',
    lastName: 'Operations',
    role: 'user',
    preferences: {
      defaultView: 'aircraft',
      notifications: true,
      theme: 'dark'
    },
    permissions: [
      'avinode:read',
      'avinode:write',
      'apollo:read'
    ],
    metadata: {
      company: 'JetVision',
      department: 'Operations',
      certifications: ['Part 135', 'International']
    }
  },
  {
    id: 'demo-user-1',
    email: 'demo@jetvision-test.com',
    firstName: 'Demo',
    lastName: 'User',
    role: 'demo',
    preferences: {
      defaultView: 'demo',
      notifications: false,
      theme: 'light'
    },
    permissions: [
      'apollo:read',
      'avinode:read'
    ],
    metadata: {
      demoExpiresAt: '2024-12-31T23:59:59Z',
      features: ['limited_queries', 'read_only']
    }
  }
];

export interface AuthSession {
  userId: string;
  sessionId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  permissions: string[];
}

export const mockAuthSessions: Record<string, AuthSession> = {
  'admin-user-1': {
    userId: 'admin-user-1',
    sessionId: 'session-admin-123',
    accessToken: 'mock-admin-token',
    refreshToken: 'mock-admin-refresh',
    expiresAt: '2024-12-31T23:59:59Z',
    permissions: testUsers[0].permissions
  },
  'sales-user-1': {
    userId: 'sales-user-1',
    sessionId: 'session-sales-456',
    accessToken: 'mock-sales-token',
    refreshToken: 'mock-sales-refresh',
    expiresAt: '2024-12-31T23:59:59Z',
    permissions: testUsers[1].permissions
  },
  'charter-ops-1': {
    userId: 'charter-ops-1',
    sessionId: 'session-ops-789',
    accessToken: 'mock-ops-token',
    refreshToken: 'mock-ops-refresh',
    expiresAt: '2024-12-31T23:59:59Z',
    permissions: testUsers[2].permissions
  },
  'demo-user-1': {
    userId: 'demo-user-1',
    sessionId: 'session-demo-101',
    accessToken: 'mock-demo-token',
    expiresAt: '2024-12-31T23:59:59Z',
    permissions: testUsers[3].permissions
  }
};

export const getUserById = (id: string): TestUser | undefined => {
  return testUsers.find(user => user.id === id);
};

export const getUserByEmail = (email: string): TestUser | undefined => {
  return testUsers.find(user => user.email === email);
};

export const getUsersByRole = (role: 'admin' | 'user' | 'demo'): TestUser[] => {
  return testUsers.filter(user => user.role === role);
};

export const getSessionForUser = (userId: string): AuthSession | undefined => {
  return mockAuthSessions[userId];
};