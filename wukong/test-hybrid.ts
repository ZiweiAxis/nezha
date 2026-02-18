#!/usr/bin/env node

/**
 * 集成测试：悟空端审批通知混合方案（WebSocket + 轮询）
 */

import WebSocket from 'ws';
import http from 'http';

const DITING_API = process.env.DITING_API || 'http://localhost:8080';
const DITING_WS = process.env.DITING_WS || 'ws://localhost:8080/api/v1/ws/policy';

let approvalId = '';

// 1. 创建审批请求
async function createApproval() {
  const response = await fetch(`${DITING_API}/api/v1/approval/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: 'did:agent:test-hybrid',
      scope: { resource: 'db:orders' },
      actions: ['read'],
      requester: 'did:human:tester'
    })
  });
  
  const data = await response.json() as any;
  approvalId = data.approval.id;
  console.log('[1] 审批请求已创建:', approvalId);
  return approvalId;
}

// 2. 推送到 Matrix
async function deliverToMatrix(id: string) {
  const response = await fetch(`${DITING_API}/api/v1/delivery/approval-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request_id: id,
      title: `审批请求: ${id}`,
      description: '测试混合方案',
      trace_id: id,
      gateway_base_url: 'http://localhost:8080'
    })
  });
  
  const data = await response.json() as any;
  console.log('[2] 已推送到 Matrix, event_id:', data.event_id);
}

// 3. WebSocket 连接测试
async function testWebSocket(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('[3] 测试 WebSocket 连接...');
    const ws = new WebSocket(DITING_WS);
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        ws.close();
      }
    };

    ws.on('open', () => {
      console.log('[3.1] WebSocket 已连接');
      ws.send(JSON.stringify({ 
        type: 'register', 
        payload: { client_id: 'wukong-hybrid-test' } 
      }));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        console.log('[3.2] 收到消息:', msg.type);
        
        if (msg.type === 'approval_result' && msg.payload?.approval_id === approvalId) {
          console.log('\n✅ WebSocket 测试通过!');
          console.log('   审批状态:', msg.payload.status);
          cleanup();
          resolve();
        }
      } catch (e) {}
    });

    ws.on('error', (e) => {
      console.error('[3.3] WebSocket 错误:', e.message);
      reject(e);
    });

    ws.on('close', () => {
      console.log('[3.4] WebSocket 已关闭');
    });

    // 审批后检查结果
    setTimeout(() => {
      if (!resolved) {
        console.log('[3.5] 等待审批...');
      }
    }, 3000);

    // 30秒超时
    setTimeout(() => {
      console.log('⏰ WebSocket 测试超时');
      cleanup();
      reject(new Error('Timeout'));
    }, 30000);
  });
}

// 4. 轮询测试
async function testPolling(id: string): Promise<void> {
  console.log('[4] 测试轮询降级...');
  
  const maxAttempts = 10;
  let attempt = 0;
  
  while (attempt < maxAttempts) {
    attempt++;
    try {
      const response = await fetch(`${DITING_API}/api/v1/approval/${id}`);
      const data = await response.json() as any;
      console.log(`[4.${attempt}] 轮询状态:`, data.status);
      
      if (data.status === 'APPROVED') {
        console.log('\n✅ 轮询测试通过!');
        return;
      }
    } catch (e) {
      console.error('轮询错误:', e);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  
  throw new Error('轮询超时');
}

async function main() {
  console.log('===========================================');
  console.log('  悟空混合方案集成测试');
  console.log('===========================================\n');

  try {
    // 1. 创建审批
    const id = await createApproval();
    
    // 2. 推送 Matrix
    await deliverToMatrix(id);
    
    // 3. 通知用户
    console.log('\n===========================================');
    console.log('  ⏰ 请在手机端审批');
    console.log('  审批 ID:', id);
    console.log('===========================================\n');

    // 3. 测试 WebSocket
    await testWebSocket();
    
    // 4. 测试轮询（备用）
    // await testPolling(id);
    
    console.log('\n✅ 集成测试完成!');
  } catch (err) {
    console.error('\n❌ 测试失败:', err);
    process.exit(1);
  }
}

main();
