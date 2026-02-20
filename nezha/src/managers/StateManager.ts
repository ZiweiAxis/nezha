import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { AgentInstance, AgentStatus } from '../types';
import { IStateManager } from '../core/IStateManager';
import { ITianshuClient } from '../core/ITianshuClient';
import { IIdentityManager } from '../core/IIdentityManager';

/**
 * 状态管理器实现
 */
export class StateManager implements IStateManager {
  private instancesPath: string;

  constructor(
    private tianshuClient: ITianshuClient,
    private identityManager: IIdentityManager,
    dataDir?: string
  ) {
    const baseDir = dataDir || path.join(os.homedir(), '.wukong');
    this.instancesPath = path.join(baseDir, 'instances.json');
  }

  async saveInstance(instance: AgentInstance): Promise<void> {
    const instances = await this.loadInstances();
    const index = instances.findIndex(i => i.name === instance.name);

    if (index >= 0) {
      instances[index] = instance;
    } else {
      instances.push(instance);
    }

    await this.saveInstances(instances);
    await this.syncToTianshu(instance.name);
  }

  async getInstance(name: string): Promise<AgentInstance | null> {
    const instances = await this.loadInstances();
    return instances.find(i => i.name === name) || null;
  }

  async updateStatus(name: string, status: AgentStatus): Promise<void> {
    const instance = await this.getInstance(name);
    if (!instance) {
      throw new Error(`Instance '${name}' not found`);
    }

    instance.status = status;
    if (status === AgentStatus.STOPPED) {
      instance.stoppedAt = new Date();
    }

    await this.saveInstance(instance);
  }

  async listInstances(): Promise<AgentInstance[]> {
    return await this.loadInstances();
  }

  async removeInstance(name: string): Promise<void> {
    const instances = await this.loadInstances();
    const filtered = instances.filter(i => i.name !== name);
    await this.saveInstances(filtered);
  }

  async syncToTianshu(name: string): Promise<void> {
    const instance = await this.getInstance(name);
    if (!instance) {
      return;
    }

    const identity = await this.identityManager.getIdentity(name);
    if (!identity) {
      return;
    }

    // 发送心跳到天枢
    await this.tianshuClient.heartbeat({
      agentId: identity.id,
      status: instance.status,
      metrics: {
        uptime: instance.startedAt
          ? Date.now() - instance.startedAt.getTime()
          : 0,
      },
    });
  }

  private async loadInstances(): Promise<AgentInstance[]> {
    try {
      await fs.mkdir(path.dirname(this.instancesPath), { recursive: true });
      const data = await fs.readFile(this.instancesPath, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  private async saveInstances(instances: AgentInstance[]): Promise<void> {
    await fs.mkdir(path.dirname(this.instancesPath), { recursive: true });
    await fs.writeFile(this.instancesPath, JSON.stringify(instances, null, 2));
  }
}
