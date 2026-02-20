import { spawn, ChildProcess } from 'child_process';
import { AgentConfig, AgentInstance, AgentStatus, RunMode } from '../types';
import { IAgentAdapter } from '../core/IAgentAdapter';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Claude Agent 适配器
 */
export class ClaudeAdapter implements IAgentAdapter {
  readonly name = 'claude';
  private processes: Map<string, ChildProcess> = new Map();

  async start(config: AgentConfig): Promise<AgentInstance> {
    const workDir = config.workDir || process.cwd();

    // 根据运行模式启动
    switch (config.mode) {
      case RunMode.LOCAL:
        return await this.startLocal(config, workDir);
      case RunMode.SANDBOX:
        return await this.startSandbox(config, workDir);
      case RunMode.DEEP_SANDBOX:
        return await this.startDeepSandbox(config, workDir);
      default:
        throw new Error(`Unsupported run mode: ${config.mode}`);
    }
  }

  async stop(instance: AgentInstance): Promise<void> {
    // 如果是沙箱模式，需要停止容器
    if (instance.mode === RunMode.SANDBOX && instance.containerId) {
      const { execSync } = require('child_process');
      try {
        execSync(`podman stop ${instance.containerId}`, { stdio: 'pipe' });
        execSync(`podman rm ${instance.containerId}`, { stdio: 'pipe' });
        console.log(`[ClaudeAdapter] Container ${instance.containerId} stopped and removed`);
      } catch (error) {
        console.error(`[ClaudeAdapter] Failed to stop container: ${error}`);
      }
      return;
    }

    // 本地模式，停止进程
    const process = this.processes.get(instance.name);
    if (process && !process.killed) {
      process.kill('SIGTERM');
      this.processes.delete(instance.name);
    }
  }

  async restart(instance: AgentInstance): Promise<AgentInstance> {
    await this.stop(instance);

    // 重新构建配置
    const config: AgentConfig = {
      name: instance.name,
      type: instance.type,
      mode: instance.mode,
    };

    return await this.start(config);
  }

  async checkStatus(instance: AgentInstance): Promise<boolean> {
    const process = this.processes.get(instance.name);
    return process !== undefined && !process.killed;
  }

  /**
   * 谛听服务地址
   */
  private readonly DITING_URL = 'http://localhost:8080';

  /**
   * 配置谛听 Hook，使 Agent 运行在策略监控下
   * 
   * 实现方案：
   * 1. 检查谛听服务是否可用
   * 2. 配置环境变量使 Agent 请求通过谛听代理
   * 3. 设置 DITING_SUBJECT 为 agent 名称用于追踪
   */
  async configureDitingHook(instance: AgentInstance): Promise<void> {
    console.log(`[ClaudeAdapter] Configuring diting-hook for ${instance.name}`);

    // 1. 检查谛听服务是否可用
    try {
      const response = await fetch(`${this.DITING_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) {
        console.warn(`[ClaudeAdapter] Diting service returned non-OK status: ${response.status}`);
      }
    } catch (error) {
      console.warn(`[ClaudeAdapter] Diting service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // 不阻止启动，仅警告
    }

    // 2. 配置环境变量 - 谛听作为 HTTP 代理
    const diterEnv: Record<string, string> = {
      DITING_ENABLED: 'true',
      DITING_URL: this.DITING_URL,
      DITING_SUBJECT: instance.name,
      // HTTP/HTTPS 代理设置，使 Agent 请求通过谛听
      HTTP_PROXY: this.DITING_URL,
      HTTPS_PROXY: this.DITING_URL,
      http_proxy: this.DITING_URL,
      https_proxy: this.DITING_URL,
    };

    // 3. 将环境变量存储到实例元数据中
    instance.ditingConfig = {
      enabled: true,
      url: this.DITING_URL,
      subject: instance.name,
      env: diterEnv,
    };

    console.log(`[ClaudeAdapter] Diting-hook configured for ${instance.name}:`, {
      url: this.DITING_URL,
      subject: instance.name,
    });
  }

  private async startLocal(config: AgentConfig, workDir: string): Promise<AgentInstance> {
    // 启动 Claude CLI
    const env = {
      ...process.env,
      ...config.env,
      WUKONG_AGENT_NAME: config.name,
    };

    const claudeProcess = spawn('claude', [], {
      cwd: workDir,
      env,
      detached: true,
      stdio: 'ignore',
    });

    claudeProcess.unref();

    this.processes.set(config.name, claudeProcess);

    const instance: AgentInstance = {
      id: `${config.name}-${Date.now()}`,
      name: config.name,
      type: config.type,
      mode: config.mode,
      status: AgentStatus.RUNNING,
      pid: claudeProcess.pid,
      startedAt: new Date(),
      restartCount: 0,
    };

    return instance;
  }

  /**
   * 使用 Podman 启动沙箱容器
   * 
   * 实现方案：
   * 1. 创建工作目录的挂载路径
   * 2. 使用包含 Go 的镜像（需要编译 diter-hook）
   * 3. 在容器内安装 diter-hook
   * 4. 配置 Claude Code hooks
   * 5. 返回容器实例信息
   */
  private async startSandbox(config: AgentConfig, workDir: string): Promise<AgentInstance> {
    const containerName = `nezha-sandbox-${config.name}-${Date.now()}`;
    
    // 1. 确保工作目录存在
    const absoluteWorkDir = path.isAbsolute(workDir) ? workDir : path.resolve(process.cwd(), workDir);
    
    try {
      await fs.access(absoluteWorkDir);
    } catch {
      throw new Error(`Work directory does not exist: ${absoluteWorkDir}`);
    }

    // 2. 构建 podman 运行命令
    // 使用 golang:alpine 镜像（需要 Go 环境编译 diter-hook）
    const imageName = 'docker.io/library/golang:1.21-alpine';
    
    // 环境变量
    const envVars = [
      `WUKONG_AGENT_NAME=${config.name}`,
      `WUKONG_MODE=sandbox`,
      // diter-hook 配置
      `DITING_URL=${this.DITING_URL}`,
      `DITING_SUBJECT=${config.name}`,
    ];
    
    // 添加自定义环境变量
    if (config.env) {
      for (const [key, value] of Object.entries(config.env)) {
        envVars.push(`${key}=${value}`);
      }
    }

    // 3. 使用 podman run 启动容器
    const podmanArgs = [
      'run',
      '-d',
      '--name', containerName,
      '-v', `${absoluteWorkDir}:/workspace`,
      '-w', '/workspace',
      '--network', 'bridge',
      ...envVars.flatMap(e => ['-e', e]),
      imageName,
      'sleep', 'infinity',
    ];

    const { execSync } = require('child_process');
    
    console.log(`[ClaudeAdapter] Starting sandbox container: podman ${podmanArgs.join(' ')}`);
    
    let containerId: string;
    try {
      containerId = execSync(`podman ${podmanArgs.join(' ')}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      
      console.log(`[ClaudeAdapter] Container started: ${containerId}`);
    } catch (error) {
      const err = error as Error & { stderr?: string };
      throw new Error(`Failed to start sandbox container: ${err.message}\n${err.stderr || ''}`);
    }

    // 4. 在容器内安装 diter-hook
    console.log(`[ClaudeAdapter] Installing diter-hook in container...`);
    try {
      // 安装 Go 和编译 diter-hook
      execSync(`podman exec ${containerId} apk add --no-cache git`, {
        stdio: 'pipe',
      });
      
      // 克隆并编译 diter-hook
      execSync(`podman exec ${containerId} sh -c "cd /tmp && git clone --depth 1 https://github.com/ZiweiAxis/nezha.git && cd nezha/xiezhi/cmd/diting_hook && go build -o diter-hook"`, {
        stdio: 'pipe',
      });
      
      console.log(`[ClaudeAdapter] diter-hook compiled successfully`);
    } catch (error) {
      console.warn(`[ClaudeAdapter] Failed to install diter-hook: ${error}`);
      // 不阻止启动，仅警告
    }

    // 5. 配置 Claude Code hooks
    try {
      // 创建 .claude 目录和 settings.json
      execSync(`podman exec ${containerId} sh -c "mkdir -p /workspace/.claude"`, {
        stdio: 'pipe',
      });
      
      const hookSettings = {
        "hooks": {
          "PreToolUse": [
            {
              "match": ".*",
              "hooks": [
                {
                  "type": "command",
                  "command": "/tmp/nezha/xiezhi/cmd/diting_hook/diting-hook",
                  "args": ["check", "--input", "${json .}"]
                }
              ]
            }
          ]
        }
      };
      
      // 写入 settings.json
      execSync(`podman exec ${containerName} sh -c 'echo \${HOOK_SETTINGS} > /workspace/.claude/settings.json'`, {
        env: { HOOK_SETTINGS: JSON.stringify(hookSettings) },
        stdio: 'pipe',
      });
      
      console.log(`[ClaudeAdapter] Claude Code hooks configured`);
    } catch (error) {
      console.warn(`[ClaudeAdapter] Failed to configure hooks: ${error}`);
    }
    
    const instance: AgentInstance = {
      id: containerId,
      name: config.name,
      type: config.type,
      mode: config.mode,
      status: AgentStatus.RUNNING,
      containerId: containerId,
      startedAt: new Date(),
      restartCount: 0,
      sandboxConfig: {
        containerName,
        workDir: absoluteWorkDir,
        imageName,
      },
    };

    // 6. 配置 diter-hook
    await this.configureDitingHook(instance);

    return instance;
  }

  private async startDeepSandbox(config: AgentConfig, workDir: string): Promise<AgentInstance> {
    // TODO: 实现 gVisor 深度沙箱启动
    throw new Error('gVisor deep sandbox mode not implemented yet');
  }
}
