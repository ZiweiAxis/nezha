import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TaskSuspendManager, SuspendedTaskStatus } from '../../src/managers/TaskSuspendManager';

describe('TaskSuspendManager', () => {
  let manager: TaskSuspendManager;
  let mockCheckApproval: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockCheckApproval = vi.fn();
    manager = new TaskSuspendManager(mockCheckApproval, undefined, {
      pollingIntervalMs: 100,
      storagePath: '/tmp/wukong-test-suspended-tasks.json',
    });
  });

  afterEach(() => {
    manager.stopPolling();
  });

  describe('suspend()', () => {
    it('should create a suspended task with pending status', async () => {
      mockCheckApproval.mockResolvedValue({ approved: false, status: 'pending' });

      const task = await manager.suspend({
        name: 'test-agent',
        type: 'claude',
        config: { mode: 'local' },
        cheqId: 'cheq-123',
      });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.name).toBe('test-agent');
      expect(task.status).toBe(SuspendedTaskStatus.PENDING);
      expect(task.cheqId).toBe('cheq-123');
      expect(task.createdAt).toBeInstanceOf(Date);
    });

    it('should store task in memory', async () => {
      const task = await manager.suspend({
        name: 'test-agent',
        type: 'claude',
        config: {},
      });

      const stored = manager.getTask(task.id);
      expect(stored).toBeDefined();
      expect(stored?.id).toBe(task.id);
    });

    it('should list all suspended tasks', async () => {
      await manager.suspend({ name: 'agent-1', type: 'claude', config: {} });
      await manager.suspend({ name: 'agent-2', type: 'claude', config: {} });

      const tasks = manager.listTasks();
      expect(tasks).toHaveLength(2);
    });
  });

  describe('markApproved()', () => {
    it('should mark task as approved', async () => {
      const task = await manager.suspend({
        name: 'test-agent',
        type: 'claude',
        config: {},
      });

      // Mark as approved
      manager.markApproved(task.id);

      const updated = manager.getTask(task.id);
      expect(updated?.status).toBe(SuspendedTaskStatus.APPROVED);
      expect(updated?.approvedAt).toBeInstanceOf(Date);
    });

    it('should resolve waitForCompletion when approved', async () => {
      const task = await manager.suspend({
        name: 'test-agent',
        type: 'claude',
        config: {},
      });

      // Mark as approved
      manager.markApproved(task.id);

      // Wait for completion
      const result = await manager.waitForCompletion(task.id, 5000);
      expect(result).toBeDefined();
      expect(result.status).toBe(SuspendedTaskStatus.APPROVED);
    });
  });

  describe('markRejected()', () => {
    it('should mark task as rejected', async () => {
      const task = await manager.suspend({
        name: 'test-agent',
        type: 'claude',
        config: {},
      });

      // Mark as rejected
      manager.markRejected(task.id, 'Approval denied');

      const updated = manager.getTask(task.id);
      expect(updated?.status).toBe(SuspendedTaskStatus.REJECTED);
      expect(updated?.error).toBe('Approval denied');
    });

    it('should reject waitForCompletion when rejected', async () => {
      const task = await manager.suspend({
        name: 'test-agent',
        type: 'claude',
        config: {},
      });

      // Mark as rejected
      manager.markRejected(task.id, 'Approval denied');

      // Wait for completion should reject
      await expect(manager.waitForCompletion(task.id, 5000)).rejects.toThrow('Approval denied');
    });
  });

  describe('polling', () => {
    it('should poll approval status periodically', async () => {
      // First call returns pending, second returns approved
      mockCheckApproval
        .mockResolvedValueOnce({ approved: false, status: 'pending' })
        .mockResolvedValueOnce({ approved: true, status: 'approved' });

      const task = await manager.suspend({
        name: 'test-agent',
        type: 'claude',
        config: {},
        cheqId: 'cheq-123',
      });

      // Start polling
      manager.startPolling(50);

      // Wait for polling to detect approval
      await new Promise(resolve => setTimeout(resolve, 200));

      const updated = manager.getTask(task.id);
      expect(updated?.status).toBe(SuspendedTaskStatus.APPROVED);
      
      // Check that polling was called
      expect(mockCheckApproval).toHaveBeenCalled();
    });

    it('should stop polling when stopPolling is called', async () => {
      mockCheckApproval.mockResolvedValue({ approved: false, status: 'pending' });

      await manager.suspend({
        name: 'test-agent',
        type: 'claude',
        config: {},
      });

      manager.startPolling(50);
      manager.stopPolling();

      // Wait and check that no more polling happens
      const callsBefore = mockCheckApproval.mock.calls.length;
      await new Promise(resolve => setTimeout(resolve, 100));
      const callsAfter = mockCheckApproval.mock.calls.length;

      expect(callsBefore).toBe(callsAfter);
    });
  });

  describe('waitForCompletion()', () => {
    it('should timeout if task does not complete', async () => {
      await manager.suspend({
        name: 'test-agent',
        type: 'claude',
        config: {},
      });

      // Wait with short timeout
      await expect(manager.waitForCompletion('non-existent-id', 100)).rejects.toThrow('not found');
    });
  });

  describe('removeTask()', () => {
    it('should remove task from storage', async () => {
      const task = await manager.suspend({
        name: 'test-agent',
        type: 'claude',
        config: {},
      });

      manager.removeTask(task.id);

      const stored = manager.getTask(task.id);
      expect(stored).toBeUndefined();
    });
  });
});
