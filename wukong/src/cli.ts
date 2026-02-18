#!/usr/bin/env node
import { Command } from 'commander';
import { createWukong } from './index';
import { RunMode } from './types';
import { loadConfig } from './utils/config';

const program = new Command();

program
  .name('wukong')
  .description('紫微智能体治理平台的 Agent 生命周期管理器')
  .version('0.1.0');

// wukong claude - 启动 Claude Agent
program
  .command('claude')
  .description('启动 Claude Agent')
  .option('-n, --name <name>', 'Agent 名称', 'claude-default')
  .option('-m, --mode <mode>', '运行模式 (local|sandbox|deep-sandbox)', 'local')
  .option('-w, --work-dir <dir>', '工作目录', process.cwd())
  .option('--auto-restart', '启用自动重启', false)
  .option('--detach', '后台运行（默认已分离）', true)
  .option('--suspend', '启用任务挂起模式（审批时挂起而不是阻塞等待）', false)
  .action(async (options) => {
    try {
      const wukong = await createWukong();
      
      // 根据参数决定是否使用挂起模式
      const result = await wukong.startAgent({
        name: options.name,
        type: 'claude',
        mode: options.mode as RunMode,
        workDir: options.workDir,
        autoRestart: options.autoRestart,
      }, options.suspend);

      // 检查返回类型
      if ('pid' in result) {
        // AgentInstance
        console.log('\n✅ Claude Agent started successfully!');
        console.log(`   Name: ${result.name}`);
        console.log(`   PID: ${result.pid}`);
        console.log(`   Mode: ${result.mode}`);
        console.log(`   Status: ${result.status}`);
      } else {
        // SuspendedTask - 任务被挂起
        console.log('\n⏳ Agent 启动已挂起，等待审批...');
        console.log(`   Task ID: ${result.id}`);
        console.log(`   Name: ${result.name}`);
        console.log(`   Status: ${result.status}`);
        console.log(`\n请等待审批完成后，任务将自动执行。`);
        console.log(`可以使用 'wukong task status ${result.id}' 查看状态。`);
      }
    } catch (error: any) {
      console.error('❌ Failed to start Claude Agent:', error.message);
      process.exit(1);
    }
  });

// wukong list - 列出所有 Agent
program
  .command('list')
  .description('列出所有 Agent 实例')
  .option('-f, --format <fmt>', '输出格式 (text|json)', 'text')
  .action(async (options) => {
    try {
      const wukong = await createWukong();
      const instances = await wukong.listAgents();

      if (options.format === 'json') {
        console.log(JSON.stringify(instances.map(i => ({
          name: i.name,
          type: i.type,
          status: i.status,
          pid: i.pid,
          mode: i.mode,
          startedAt: i.startedAt?.toISOString(),
          restartCount: i.restartCount,
        })), null, 2));
        return;
      }

      if (instances.length === 0) {
        console.log('No agents running.');
        return;
      }

      console.log('\nRunning Agents:');
      console.log('─'.repeat(80));
      console.log(
        'NAME'.padEnd(20),
        'TYPE'.padEnd(10),
        'STATUS'.padEnd(12),
        'PID'.padEnd(8),
        'MODE'.padEnd(15)
      );
      console.log('─'.repeat(80));

      for (const instance of instances) {
        console.log(
          instance.name.padEnd(20),
          instance.type.padEnd(10),
          instance.status.padEnd(12),
          (instance.pid?.toString() || '-').padEnd(8),
          instance.mode.padEnd(15)
        );
      }
    } catch (error: any) {
      console.error('❌ Failed to list agents:', error.message);
      process.exit(1);
    }
  });

// wukong status <name> - 查看 Agent 状态
program
  .command('status <name>')
  .description('查看 Agent 状态')
  .option('-f, --format <fmt>', '输出格式 (text|json)', 'text')
  .action(async (name, options) => {
    try {
      const wukong = await createWukong();
      const instance = await wukong.getAgentStatus(name);

      if (!instance) {
        if (options.format === 'json') {
          console.log(JSON.stringify({ error: 'not_found', name }));
        } else {
          console.log(`Agent '${name}' not found.`);
        }
        return;
      }

      if (options.format === 'json') {
        console.log(JSON.stringify({
          name: instance.name,
          type: instance.type,
          status: instance.status,
          mode: instance.mode,
          pid: instance.pid,
          startedAt: instance.startedAt?.toISOString(),
          restartCount: instance.restartCount,
        }, null, 2));
        return;
      }

      console.log('\nAgent Status:');
      console.log('─'.repeat(50));
      console.log(`Name:         ${instance.name}`);
      console.log(`Type:         ${instance.type}`);
      console.log(`Status:       ${instance.status}`);
      console.log(`Mode:         ${instance.mode}`);
      console.log(`PID:          ${instance.pid || '-'}`);
      console.log(`Started At:   ${instance.startedAt?.toISOString() || '-'}`);
      console.log(`Restart Count: ${instance.restartCount}`);
    } catch (error: any) {
      console.error('❌ Failed to get agent status:', error.message);
      process.exit(1);
    }
  });

// wukong stop <name> - 停止 Agent
program
  .command('stop <name>')
  .description('停止 Agent')
  .action(async (name) => {
    try {
      const wukong = await createWukong();
      await wukong.stopAgent(name);
      console.log(`✅ Agent '${name}' stopped successfully.`);
    } catch (error: any) {
      console.error('❌ Failed to stop agent:', error.message);
      process.exit(1);
    }
  });

// wukong restart <name> - 重启 Agent
program
  .command('restart <name>')
  .description('重启 Agent')
  .action(async (name) => {
    try {
      const wukong = await createWukong();
      const instance = await wukong.restartAgent(name);
      console.log(`✅ Agent '${name}' restarted successfully.`);
      console.log(`   PID: ${instance.pid}`);
    } catch (error: any) {
      console.error('❌ Failed to restart agent:', error.message);
      process.exit(1);
    }
  });

// wukong logs <name> - 查看 Agent 日志
program
  .command('logs <name>')
  .description('查看 Agent 日志')
  .option('-n, --lines <number>', '显示行数', '100')
  .action(async (name, options) => {
    try {
      const wukong = await createWukong();
      const logs = await wukong.getAgentLogs(name, parseInt(options.lines));
      console.log(logs);
    } catch (error: any) {
      console.error('❌ Failed to get agent logs:', error.message);
      process.exit(1);
    }
  });

// wukong identity - 管理身份
program
  .command('identity')
  .description('管理 Agent 身份')
  .option('-l, --list', '列出所有身份')
  .option('-r, --register <name>', '注册新身份')
  .option('-t, --type <type>', '身份类型', 'claude')
  .action(async (options) => {
    try {
      const wukong = await createWukong();
      if (options.list) {
        const identities = await wukong.listIdentities();

        if (identities.length === 0) {
          console.log('No identities registered.');
          return;
        }

        console.log('\nRegistered Identities:');
        console.log('─'.repeat(80));
        console.log(
          'NAME'.padEnd(20),
          'TYPE'.padEnd(10),
          'STATUS'.padEnd(12),
          'RISK'.padEnd(10),
          'CREATED'.padEnd(20)
        );
        console.log('─'.repeat(80));

        for (const identity of identities) {
          console.log(
            identity.name.padEnd(20),
            identity.type.padEnd(10),
            identity.status.padEnd(12),
            identity.riskLevel.padEnd(10),
            identity.createdAt.toISOString().split('T')[0].padEnd(20)
          );
        }
      } else if (options.register) {
        const identity = await wukong.registerIdentity(options.register, options.type);
        console.log(`✅ Identity '${identity.name}' registered successfully.`);
        console.log(`   ID: ${identity.id}`);
        console.log(`   Status: ${identity.status}`);
        console.log(`   Risk Level: ${identity.riskLevel}`);
      } else {
        console.log('Please specify --list or --register <name>');
      }
    } catch (error: any) {
      console.error('❌ Failed to manage identity:', error.message);
      process.exit(1);
    }
  });

// wukong task - 管理挂起的任务
program
  .command('task')
  .description('管理挂起的任务')
  .option('-l, --list', '列出所有挂起的任务')
  .option('-s, --status <taskId>', '查看任务状态')
  .option('-w, --wait <taskId>', '等待任务完成')
  .option('--timeout <ms>', '等待超时（毫秒）', '0')
  .action(async (options) => {
    try {
      const wukong = await createWukong();
      
      if (options.list) {
        const tasks = wukong.listSuspendedTasks();
        if (tasks.length === 0) {
          console.log('No suspended tasks.');
          return;
        }
        console.log('\nSuspended Tasks:');
        console.log('─'.repeat(80));
        console.log(
          'ID'.padEnd(25),
          'NAME'.padEnd(20),
          'STATUS'.padEnd(15),
          'CREATED'.padEnd(20)
        );
        console.log('─'.repeat(80));
        for (const task of tasks) {
          console.log(
            task.id.padEnd(25),
            task.name.padEnd(20),
            task.status.padEnd(15),
            task.createdAt.toISOString().padEnd(20)
          );
        }
      } else if (options.status) {
        const manager = wukong.getTaskSuspendManager();
        if (!manager) {
          console.log('Task suspend manager not available. Make sure suspend mode is enabled.');
          return;
        }
        const task = manager.getTask(options.status);
        if (!task) {
          console.log(`Task '${options.status}' not found.`);
          return;
        }
        console.log('\nTask Status:');
        console.log('─'.repeat(50));
        console.log(`ID:          ${task.id}`);
        console.log(`Name:        ${task.name}`);
        console.log(`Type:        ${task.type}`);
        console.log(`Status:      ${task.status}`);
        console.log(`CHEQ ID:     ${task.cheqId || '-'}`);
        console.log(`Created:     ${task.createdAt.toISOString()}`);
        console.log(`Approved:    ${task.approvedAt?.toISOString() || '-'}`);
        console.log(`Completed:   ${task.completedAt?.toISOString() || '-'}`);
        if (task.error) {
          console.log(`Error:       ${task.error}`);
        }
      } else if (options.wait) {
        const timeout = parseInt(options.timeout) || undefined;
        try {
          const result = await wukong.waitForSuspendedTask(options.wait, timeout);
          console.log('\n✅ Task completed!');
          console.log(JSON.stringify(result, null, 2));
        } catch (error: any) {
          console.error('❌ Task failed or timed out:', error.message);
          process.exit(1);
        }
      } else {
        console.log('Please specify --list, --status <taskId>, or --wait <taskId>');
      }
    } catch (error: any) {
      console.error('❌ Failed to manage tasks:', error.message);
      process.exit(1);
    }
  });

// wukong config - 查看配置（FR14/FR15）
program
  .command('config')
  .description('查看当前配置（环境变量与 ~/.wukong/config.json）')
  .option('-f, --format <fmt>', '输出格式 (text|json)', 'text')
  .action(async (options) => {
    try {
      const config = await loadConfig();
      if (options.format === 'json') {
        console.log(JSON.stringify(config, null, 2));
        return;
      }
      console.log('\nCurrent config (env + ~/.wukong/config.json):');
      console.log('─'.repeat(50));
      console.log('tianshu_api_url:', config.tianshu_api_url || '(default/local)');
      console.log('wukong_owner_id:', config.wukong_owner_id || '(default)');
      console.log('approval_poll_interval_ms:', config.approval_poll_interval_ms ?? '(none)');
      console.log('approval_poll_max_attempts:', config.approval_poll_max_attempts ?? '(none)');
    } catch (error: any) {
      console.error('❌ Failed to load config:', error.message);
      process.exit(1);
    }
  });

program.parse();
