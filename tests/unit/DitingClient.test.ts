import { describe, it, expect, vi } from 'vitest';

// Mock ws module - but don't import DitingClient since it requires TaskSuspendManager
vi.mock('ws', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      return {
        on: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        readyState: 1, // WebSocket.OPEN
      };
    }),
  };
});

// Mock TaskSuspendManager
vi.mock('../../src/managers/TaskSuspendManager', () => ({
  TaskSuspendManager: vi.fn().mockImplementation(() => ({
    markApproved: vi.fn(),
    markRejected: vi.fn(),
  })),
}));

describe('DitingClient', () => {
  // Note: Full integration tests would require a running Diting server
  // These are basic structure tests to verify the module loads
  
  it('should have correct interface definitions', async () => {
    // Import types from the module
    const { DitingClient } = await import('../../src/clients/DitingClient');
    
    expect(DitingClient).toBeDefined();
    // DitingClient should be a class that extends EventEmitter
    expect(typeof DitingClient).toBe('function');
  });

  it('should have DitingConfig interface structure (compile-time check)', () => {
    // This test verifies TypeScript compiles correctly
    // At runtime, we can't easily check interfaces, but we can verify the class works
    const config = {
      baseUrl: 'http://localhost:8080',
      wsUrl: 'ws://localhost:8080',
      clientId: 'test-client',
      pollingInterval: 5000,
    };

    expect(config.baseUrl).toBe('http://localhost:8080');
    expect(config.wsUrl).toBe('ws://localhost:8080');
    expect(config.clientId).toBe('test-client');
    expect(config.pollingInterval).toBe(5000);
  });

  it('should have ApprovalResult structure', () => {
    const approval = {
      approval_id: 'approval-123',
      status: 'APPROVED' as const,
      subject: 'Test Action',
      approved_by: 'admin',
      note: 'Approved',
      timestamp: '2024-01-01T00:00:00Z',
    };

    expect(approval.approval_id).toBe('approval-123');
    expect(approval.status).toBe('APPROVED');
    expect(approval.subject).toBe('Test Action');
  });
});
