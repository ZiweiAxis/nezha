/**
 * 沙箱模式测试脚本
 */
import { ClaudeAdapter } from './src/adapters/ClaudeAdapter';
import { AgentConfig, RunMode, AgentStatus } from './src/types';

async function testSandbox() {
  console.log('=== 测试哪吒沙箱模式 (S062) ===\n');

  const adapter = new ClaudeAdapter();
  
  const config: AgentConfig = {
    name: 'test-sandbox-agent',
    type: 'claude',
    mode: RunMode.SANDBOX,
    workDir: '/tmp/nezha-test',
    env: {
      TEST_VAR: 'test-value',
    },
  };

  console.log('1. 配置文件:', JSON.stringify(config, null, 2));
  console.log('\n2. 启动沙箱容器...\n');

  let instance;
  try {
    instance = await adapter.start(config);
    console.log('3. 容器启动成功!');
    console.log('   - Instance ID:', instance.id);
    console.log('   - Container ID:', instance.containerId);
    console.log('   - Status:', instance.status);
    console.log('   - Mode:', instance.mode);
    console.log('   - Sandbox Config:', JSON.stringify(instance.sandboxConfig, null, 2));

    // 验证容器状态
    console.log('\n4. 验证容器状态...');
    const { execSync } = require('child_process');
    
    // 检查容器是否在运行
    const psOutput = execSync(`podman ps --filter "id=${instance.containerId}" --format "{{.ID}} {{.Status}}"`, {
      encoding: 'utf-8',
    }).trim();
    
    if (psOutput) {
      console.log('   容器运行状态:', psOutput);
      console.log('\n✅ 测试结果: 成功');
    } else {
      console.log('   ⚠️ 容器未在运行列表中');
    }

    // 获取容器日志
    console.log('\n5. 容器启动日志:');
    try {
      const logs = execSync(`podman logs ${instance.containerId}`, {
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();
      console.log(logs || '(无日志)');
    } catch {
      console.log('(容器刚启动，暂无日志)');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error instanceof Error ? error.message : error);
    console.error(error);
    process.exit(1);
  }

  // 清理
  console.log('\n6. 清理测试容器...');
  try {
    await adapter.stop(instance);
    console.log('   容器已停止并删除');
  } catch (error) {
    console.error('   清理失败:', error instanceof Error ? error.message : error);
  }

  console.log('\n=== 测试完成 ===');
}

testSandbox().catch(console.error);
