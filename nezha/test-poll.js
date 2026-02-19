#!/usr/bin/env node

/**
 * 轮询测试：WebSocket + 轮询混合方案
 */

const WebSocket = require('ws');

const approvalId = process.env.APPROVAL_ID || 'approval-did:human:tester-1771310073609';

let wsConnected = false;
let ws;

async function checkPolling() {
  console.log('\n=== 轮询测试 (备用) ===');
  let attempts = 0;
  while (attempts < 30) {
    attempts++;
    try {
      const res = await fetch('http://localhost:8080/api/v1/approval/' + approvalId);
      const data = await res.json();
      console.log('轮询 ' + attempts + ': ' + data.status);
      if (data.status === 'APPROVED') {
        console.log('✅ 轮询检测到审批通过!');
        console.log('   审批人:', data.approved_by);
        if (wsConnected && ws) ws.close();
        process.exit(0);
      }
    } catch (e) {
      console.error('轮询错误:', e.message);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('轮询超时');
  if (wsConnected && ws) ws.close();
  process.exit(1);
}

// WebSocket test
console.log('=== WebSocket 测试 ===');
ws = new WebSocket('ws://localhost:8080/api/v1/ws/policy');

ws.on('open', () => {
  console.log('WebSocket 已连接');
  wsConnected = true;
  ws.send(JSON.stringify({ type: 'register', payload: { client_id: 'poll-test' } }));
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    console.log('收到:', msg.type);
    if (msg.type === 'approval_result' && msg.payload?.approval_id === approvalId) {
      console.log('✅ WebSocket 收到审批结果!');
      console.log('   状态:', msg.payload.status);
      ws.close();
      process.exit(0);
    }
  } catch (e) {}
});

ws.on('error', (e) => console.error('WS 错误:', e.message));
ws.on('close', () => { wsConnected = false; console.log('WS 关闭'); });

// 启动轮询作为备用
setTimeout(checkPolling, 5000);

setTimeout(() => { console.log('总超时'); if (ws) ws.close(); process.exit(1); }, 90000);
