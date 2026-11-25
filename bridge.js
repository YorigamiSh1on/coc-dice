// COC 骰子桥：既是网页服务器，也收掷骰结果
// 用法：双击「启动骰子桥.bat」，然后用浏览器打开 http://127.0.0.1:3999/
// 这样网页和桥同源，不会被浏览器拦；窗口别关，玩完关掉即可。
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3999;
const LOG = path.join(__dirname, 'rolls.log');
const PAGE = path.join(__dirname, 'index.html');

function stamp() {
  const t = new Date();
  const p = n => String(n).padStart(2, '0');
  return p(t.getHours()) + ':' + p(t.getMinutes()) + ':' + p(t.getSeconds());
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url.split('?')[0];

  if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
    fs.readFile(PAGE, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('读不到 index.html: ' + err.message);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(data);
    });
    return;
  }

  if (req.method === 'GET' && url.indexOf('/ping') === 0) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (req.method === 'POST' && url.indexOf('/roll') === 0) {
    let buf = '';
    req.on('data', c => {
      buf += c;
      if (buf.length > 50000) req.destroy();
    });
    req.on('end', () => {
      const line = buf.trim();
      if (line) {
        try {
          fs.appendFileSync(LOG, stamp() + '  ' + line + '\n', 'utf8');
          process.stdout.write(stamp() + '  ' + line + '\n');
        } catch (e) {
          process.stdout.write('write failed: ' + e.message + '\n');
        }
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('no');
});

server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.log('Port ' + PORT + ' is already in use - maybe the bridge is already running.');
    console.log('Close that black window first, or just use the one already open.');
  } else {
    console.log('Start failed: ' + e.message);
  }
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('==========================================');
  console.log(' COC dice bridge is running');
  console.log(' Open this in your browser:  http://127.0.0.1:3999/');
  console.log(' Rolls are appended to:      rolls.log');
  console.log(' Keep this window open, close it when done.');
  console.log('==========================================');
});
