import { describe, it, expect, beforeEach } from 'vitest';
import { IdentityManager } from '../../src/managers/IdentityManager';
import { MockTianshuClient } from '../mocks/MockTianshuClient';
import { RiskLevel } from '../../src/types';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

describe('IdentityManager', () => {
  let identityManager: IdentityManager;
  let testDataDir: string;

  beforeEach(async () => {
    testDataDir = path.join(os.tmpdir(), `wukong-test-${Date.now()}`);
    await fs.mkdir(testDataDir, { recursive: true });
    const tianshuClient = new MockTianshuClient();
    identityManager = new IdentityManager(tianshuClient, testDataDir);
  });

  it('should register a new agent identity', async () => {
    const identity = await identityManager.register('test-agent', 'claude');

    expect(identity).toBeDefined();
    expect(identity.name).toBe('test-agent');
    expect(identity.type).toBe('claude');
    expect(identity.riskLevel).toBe(RiskLevel.MEDIUM);
  });

  it('should throw error when registering duplicate identity', async () => {
    await identityManager.register('test-agent', 'claude');

    await expect(
      identityManager.register('test-agent', 'claude')
    ).rejects.toThrow("Agent identity 'test-agent' already exists");
  });

  it('should get existing identity', async () => {
    await identityManager.register('test-agent', 'claude');
    const identity = await identityManager.getIdentity('test-agent');

    expect(identity).toBeDefined();
    expect(identity?.name).toBe('test-agent');
  });

  it('should return null for non-existent identity', async () => {
    const identity = await identityManager.getIdentity('non-existent');
    expect(identity).toBeNull();
  });

  it('should list all identities', async () => {
    await identityManager.register('agent-1', 'claude');
    await identityManager.register('agent-2', 'cursor');

    const identities = await identityManager.listIdentities();
    expect(identities).toHaveLength(2);
  });

  it('should remove identity', async () => {
    await identityManager.register('test-agent', 'claude');
    await identityManager.removeIdentity('test-agent');

    const identity = await identityManager.getIdentity('test-agent');
    expect(identity).toBeNull();
  });
});
