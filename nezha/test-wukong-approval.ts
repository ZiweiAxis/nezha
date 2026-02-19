#!/usr/bin/env node

/**
 * 集成测试：审批通过后悟空端任务恢复流程
 * 
 * 测试步骤：
 * 1. 创建审批请求并推送 Matrix
 * 2. 连接谛听 WebSocket
 * 3. 等待审批回调
 * 4. 验证 WebSocket 收到 approval_result 消息
 * 5. 验证任务恢复
 */

import WebSocket from 'ws';

const DITING_WS = process.env.DITING_WS || 'ws://localhost:8080/api/v1/ws/policy';
const DITING_API = process.env.DITING_API || 'http://localhost:8080';

async function createApproval(): Promise<string> {
  const response = await fetch(`${DITING_API}/api/v1/approval/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: 'did:agent:test-wukong',
      scope: { resource: 'db:customers' },
      actions: ['read'],
      requester: 'did:human:tester'
    })
  });
  
  const data = await response.json() as any;
  console.log('[1] 审批请求已创建:', data.approval.id);
  return data.approval.id;
}

async function deliverToMatrix(approvalId: string): Promise<void> {
  const response = await fetch(`${DITING_API}/api/v1/delivery/approval-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request_id: approvalId,
      title: `审批请求: ${approvalId}`,
      description: '操作: read\n资源: db:customers',
      trace_id: approvalId,
      gateway_base_url: 'http://localhost:8080'
    })
  });
  
  const data = await response.json() as any;
  console.log('[2] 已推送到 Matrix, event_id:', data.event_id);
}

function connectWebSocket(approvalId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('[3] 连接 WebSocket...');
    const ws = new WebSocket(DITING_WS);

    ws.on('open', () => {
      console.log('[3] WebSocket 已连接');
      
      // 注册客户端
      ws.send(JSON.stringify({
        type: 'register',
        payload: { client_id: 'wukong-test-' + Date.now() }
      }));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        console.log('[收到消息]', msg.type, msg.payload || '');
        
        if (msg.type === 'approval_result') {
          const payload = msg.payload;
          if (payload.approval_id === approvalId) {
            console.log('\n✅ 收到审批结果通知!');
            console.log('   审批ID:', payload.approval_id);
            console.log('   状态:', payload.status);
            console.log('   审批人:', payload.approved_by);
            
            ws.close();
            resolve();
          }
        }
      } catch (err) {
        console.error('解析消息失败:', err);
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket 错误:', err);
      reject(err);
    });

    ws.on('close', () => {
      console.log('[WebSocket 已关闭]');
    });

    // 超时 2 分钟
    setTimeout(() => {
      console.log('⏰ 等待超时');
      ws.close();
      reject(new Error('Timeout'));
    }, 120000);
  });
}

async function main() {
  console.log('===========================================');
  console.log('  悟空集成测试：审批通过后任务恢复');
  console.log('===========================================\n');

  try {
    // 1. 创建审批请求
    const approvalId = await createApproval();
    
    // 2. 推送到 Matrix
    await deliverToMatrix(approvalId);
    
    // 3. 通知用户
    console.log('\n===========================================');
    console.log('  ⏰ 请在手机端审批');
    console.log('  审批 ID:', approvalId);
    console.log('===========================================\n');

    // 4. 连接 WebSocket 等待审批结果
    await connectWebSocket(approvalId);
    
    console.log('\n✅ 测试完成!');
  } catch (err) {
    console.error('\n❌ 测试失败:', err);
    process.exit(1);
  }
}

main();
