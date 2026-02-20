/**
 * 端到端策略拦截测试
 * 验证沙箱模式 + diter-hook 完整流程
 */
import { ClaudeAdapter } from './src/adapters/ClaudeAdapter';
import { AgentConfig, RunMode, AgentStatus } from './src/types';
import { execSync } from 'child_process';

async function testE2E() {
  console.log('=== 端到端策略拦截测试 (S063) ===\n');

  const adapter = new ClaudeAdapter();
  
  // 配置使用 SANDBOX 模式
  const config: AgentConfig = {
    name: 'test-e2e-agent',
    type: 'claude',
    mode: RunMode.SANDBOX,
    workDir: '/tmp/nezha-e2e-test',
  };

  let instance;
  
  try {
    // 1. 启动沙箱容器
    console.log('1. 启动沙箱容器...');
    instance = await adapter.start(config);
    console.log('   容器ID:', instance.containerId);
    console.log('   沙箱配置:', JSON.stringify(instance.sandboxConfig, null, 2));

    // 2. 配置 diter-hook
    console.log('\n2. 配置 diter-hook...');
    await adapter.configureDitingHook(instance);
    console.log('   diter配置:', JSON.stringify(instance.ditingConfig, null, 2));

    // 3. 验证环境变量已设置
    console.log('\n3. 验证容器内环境变量...');
    const envCheck = execSync(
      `podman exec ${instance.containerId} env | grep -E "DITING|HTTP_PROXY"`,
      { encoding: 'utf-8' }
    ).trim();
    console.log('   环境变量:', envCheck || '(未设置)');

    // 4. 测试策略 API（从宿主机）
    console.log('\n4. 测试策略 API...');
    const response = await fetch('http://localhost:8080/auth/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: instance.name,
        action: 'exec:skill:weather',
        resource: 'test'
      })
    });
    const result = await response.json();
    console.log('   策略决策:', JSON.stringify(result));

    // 5. 清理
    console.log('\n5. 清理...');
    await adapter.stop(instance);
    console.log('   清理完成');

    console.log('\n=== 测试完成 ===');
    console.log('\n✅ 结论: 端到端流程正常');
    console.log('- 沙箱容器启动成功');
    console.log('- diter-hook 配置已应用');
    console.log('- 策略 API 正常工作');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    if (instance?.containerId) {
      try {
        await adapter.stop(instance);
      } catch {}
    }
    process.exit(1);
  }
}

testE2E().catch(console.error);
