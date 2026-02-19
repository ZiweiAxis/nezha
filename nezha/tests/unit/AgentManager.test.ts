import { describe, it, expect, beforeEach } from 'vitest';
import { AgentManager } from '../../src/managers/AgentManager';
import { IdentityManager } from '../../src/managers/IdentityManager';
import { StateManager } from '../../src/managers/StateManager';
import { TianshuClient } from '../../src/clients/TianshuClient';
import { ClaudeAdapter } from '../../src/adapters/ClaudeAdapter';
import { RunMode } from '../../src/types';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

describe('AgentManager', () => {
  let agentManager: AgentManager;
  let identityManager: IdentityManager;
  let stateManager: StateManager;
  let tianshuClient: TianshuClient;
  let testDataDir: string;

  beforeEach(async () => {
    testDataDir = path.join(os.tmpdir(), `wukong-test-${Date.now()}`);
    await fs.mkdir(testDataDir, { recursive: true });

    tianshuClient = new TianshuClient();
    identityManager = new IdentityManager(tianshuClient, testDataDir);
    stateManager = new StateManager(tianshuClient, identityManager, testDataDir);
    agentManager = new AgentManager(identityManager, stateManager);

    // 注册适配器
    agentManager.registerAdapter(new ClaudeAdapter());
  });

  it('should register adapter', () => {
    const adapter = new ClaudeAdapter();
    agentManager.registerAdapter(adapter);
    // 如果没有抛出错误，说明注册成功
    expect(true).toBe(true);
  });

  it('should list empty instances initially', async () => {
    const instances = await agentManager.listInstances();
    expect(instances).toHaveLength(0);
  });

  // 注意：以下测试需要实际的 Claude CLI 环境，可能会失败
  // 在 CI/CD 环境中应该使用 mock

  it.skip('should start an agent', async () => {
    const instance = await agentManager.start({
      name: 'test-claude',
      type: 'claude',
      mode: RunMode.LOCAL,
    });

    expect(instance).toBeDefined();
    expect(instance.name).toBe('test-claude');
    expect(instance.type).toBe('claude');
  });
});
