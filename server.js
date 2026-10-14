const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

try {
  const { startServer } = require('./src/server');
  startServer().catch(err => {
    console.error('SERVER CRASH:', err);
  });
} catch (err) {
  // أول ما يحصل إيرور وقت التحميل، اطبعه على طول في الـ HTTP response
  const http = require('http');
  const server = http.createServer((req, res) => {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('CRITICAL STARTUP ERROR:\n\n' + (err.stack || err.message));
  });
  server.listen(process.env.PORT || 3000);
}