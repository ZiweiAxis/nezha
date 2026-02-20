const WebSocket = require('ws');
const fs = require('fs');

const ws = new WebSocket('ws://localhost:8080/ws/approval');

ws.on('open', function open() {
  console.log('[' + new Date().toISOString() + '] Connected to WebSocket');
  fs.appendFileSync('/tmp/ws-test.log', '[' + new Date().toISOString() + '] Connected\n');
});

ws.on('message', function incoming(data) {
  const msg = data.toString();
  console.log('[' + new Date().toISOString() + '] Received:', msg);
  fs.appendFileSync('/tmp/ws-test.log', '[' + new Date().toISOString() + '] Received: ' + msg + '\n');
});

ws.on('close', function close() {
  console.log('[' + new Date().toISOString() + '] Disconnected');
  fs.appendFileSync('/tmp/ws-test.log', '[' + new Date().toISOString() + '] Disconnected\n');
});

ws.on('error', function error(err) {
  console.error('[' + new Date().toISOString() + '] WebSocket error:', err.message);
  fs.appendFileSync('/tmp/ws-test.log', '[' + new Date().toISOString() + '] Error: ' + err.message + '\n');
});

// Keep alive
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping' }));
  }
}, 30000);
