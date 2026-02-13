const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const WWW_DIR = path.join(__dirname, '..', 'www');
const PORT = 5099;

if (!fs.existsSync(WWW_DIR)) {
  fs.mkdirSync(WWW_DIR, { recursive: true });
}

function fetchPage(pagePath) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${PORT}${pagePath}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function build() {
  console.log('Starting temporary server on port', PORT, '...');
  const server = spawn('node', ['index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe'
  });

  await new Promise(r => setTimeout(r, 2000));

  try {
    console.log('Fetching main page...');
    let html = await fetchPage('/');

    fs.writeFileSync(path.join(WWW_DIR, 'index.html'), html);
    console.log('Wrote www/index.html');

    const publicDir = path.join(__dirname, '..', 'public');
    if (fs.existsSync(publicDir)) {
      copyDirSync(publicDir, WWW_DIR);
      console.log('Copied public/ assets to www/');
    }

    console.log('Build complete! www/ directory is ready.');
  } catch (err) {
    console.error('Build failed:', err.message);
    console.error('Make sure no other process is using port', PORT);
  } finally {
    server.kill();
    process.exit(0);
  }
}

function copyDirSync(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

build();
