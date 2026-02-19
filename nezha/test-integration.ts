#!/usr/bin/env node

/**
 * 集成测试：审批通过后任务恢复流程
 * 使用轮询方式（非 WebSocket）
 * 
 * 测试步骤：
 * 1. 创建审批请求
 * 2. 等待用户在手机端审批
 * 3. 轮询审批状态
 * 4. 验证任务恢复
 */

import { DitingClient } from './src/clients/DitingClient';
import { TaskSuspendManager } from './src/managers/TaskSuspendManager';

const DITING_URL = process.env.DITING_URL || 'http://localhost:8080';

async function createApproval(): Promise<string> {
  const response = await fetch(`${DITING_URL}/api/v1/approval/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: 'did:agent:test-001',
      scope: { resource: 'db:customers' },
      actions: ['read'],
      requester: 'did:human:tester'
    })
  });
  
  const data = await response.json() as any;
  return data.approval.id;
}

async function getApprovalStatus(approvalId: string): Promise<string> {
  const response = await fetch(`${DITING_URL}/api/v1/approval/${approvalId}`);
  const data = await response.json() as any;
  return data.status;
}

async function waitForApproval(
  approvalId: string, 
  timeoutMs: number = 300000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const status = await getApprovalStatus(approvalId);
      console.log(`   审批状态: ${status}`);
      
      if (status === 'APPROVED') {
        return true;
      }
      if (status === 'REJECTED') {
        return false;
      }
    } catch (err) {
      console.log('   查询状态出错:', err);
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3秒轮询
  }
  
  throw new Error('审批超时');
}

async function main() {
  console.log('===========================================');
  console.log('  紫微集成测试：审批通过后任务恢复');
  console.log('===========================================\n');

  // 1. 初始化 TaskSuspendManager
  console.log('[1] 初始化 TaskSuspendManager...');
  const taskManager = new TaskSuspendManager(
    async () => ({ approved: false, status: 'pending' }),
    undefined,
    { pollingIntervalMs: 2000 }
  );

  // 2. 创建审批请求
  console.log('[2] 创建审批请求...');
  const approvalId = await createApproval();
  
  console.log('   ✅ 审批请求已创建');
  console.log('   📋 审批 ID:', approvalId);
  
  // 挂起一个测试任务
  const task = await taskManager.suspend({
    name: 'test-agent',
    type: 'claude',
    config: {},
    cheqId: approvalId
  });
  console.log('   📝 任务已挂起, taskId:', task.id);

  // 3. 通知用户审批
  console.log('\n===========================================');
  console.log('  ⏰ 请在手机端审批');
  console.log('===========================================');
  console.log('  审批 ID:', approvalId);
  console.log('');
  console.log('  你可以:');
  console.log('  1. 在 Matrix 中回复"批准 ' + approvalId + '"');
  console.log('  2. 或者直接调用 API:');
  console.log('     curl -X POST ' + DITING_URL + '/api/v1/cheq/approve \\');
  console.log('       -H "Content-Type: application/json" \\');
  console.log('       -d \'{"cheq_id": "' + approvalId + '"}\'');
  console.log('===========================================\n');

  // 4. 轮询等待审批结果
  console.log('等待审批中... (每3秒轮询一次)\n');
  
  try {
    const approved = await waitForApproval(approvalId);
    
    if (approved) {
      console.log('\n✅ 审批通过!');
      
      // 标记任务为已批准
      taskManager.markApproved(task.id);
      
      console.log('   任务状态已更新');
      
      // 等待任务完成
      const result = await taskManager.waitForCompletion(task.id, 5000);
      console.log('\n✅ 测试完成! 任务已恢复执行');
      console.log('   任务结果:', result);
    } else {
      console.log('\n❌ 审批被拒绝');
    }
  } catch (err) {
    console.log('\n⚠️ 等待超时');
  }

  console.log('\n测试结束');
}

main().catch(console.error);
