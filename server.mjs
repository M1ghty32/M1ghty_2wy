import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { RequestError, readJson, validateContent, withRevision, writeJson } from './server/content.mjs';
import { githubConfigured, publishToGitHub } from './server/github-publisher.mjs';

const ROOT = await realpath(dirname(fileURLToPath(import.meta.url)));
const userStateRoot = process.platform === 'win32'
  ? process.env.LOCALAPPDATA || resolve(homedir(), 'AppData', 'Local')
  : process.env.XDG_STATE_HOME || resolve(homedir(), '.local', 'state');
const STATE_DIR = resolve(process.env.SITE_STATE_DIR || resolve(userStateRoot, 'M1ghty_2wy', 'site-admin'));
const CREDENTIALS_PATH = resolve(STATE_DIR, 'credentials.json');
const CONTENT_PATH = resolve(STATE_DIR, 'content.json');
const SESSION_COOKIE = 'm1ghty_admin_session';
const SESSION_TTL = 8 * 60 * 60;
const LOGIN_WINDOW = 15 * 60 * 1000;
const BODY_LIMIT = 10 * 1024 * 1024;
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const scryptAsync = promisify(scrypt);
const sessions = new Map();
const attempts = new Map();
let activeLoginChecks = 0;
let content;

async function optionalJson(file) {
  try {
    return await readJson(file);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error('无法读取工作台配置或内容文件：' + file);
  }
}

function validUsername(username) {
  return typeof username === 'string' && username.length >= 2 && username.length <= 80 &&
    username === username.trim() && !/[\u0000-\u001f\u007f]/.test(username);
}

function parseCredentials(raw) {
  const parts = typeof raw?.passwordHash === 'string'
    ? /^scrypt:([a-f0-9]{64}):([a-f0-9]{128})$/.exec(raw.passwordHash)
    : null;
  if (!validUsername(raw?.username) || !parts) throw new Error('管理员账户配置格式有误，请运行 npm run setup。');
  return { username: raw.username, salt: Buffer.from(parts[1], 'hex'), hash: Buffer.from(parts[2], 'hex') };
}

async function loadCredentials() {
  const username = process.env.SITE_ADMIN_USERNAME;
  const passwordHash = process.env.SITE_ADMIN_PASSWORD_HASH;
  if (username || passwordHash) return parseCredentials({ username, passwordHash });
  const saved = await optionalJson(CREDENTIALS_PATH);
  return saved ? parseCredentials(saved) : null;
}

async function question(prompt, hide = false) {
  const output = hide ? new Writable({ write(_chunk, _encoding, done) { done(); } }) : process.stdout;
  const readline = createInterface({ input: process.stdin, output, terminal: true });
  const abort = new AbortController();
  readline.once('SIGINT', () => abort.abort());
  try {
    if (hide) process.stdout.write(prompt);
    return await readline.question(hide ? '' : prompt, { signal: abort.signal });
  } finally {
    readline.close();
    if (hide) process.stdout.write('\n');
  }
}

async function setup() {
  if (!process.stdin.isTTY) throw new Error('请在终端内运行 npm run setup，密码输入不会回显。');
  const username = (await question('管理员账号：')).trim();
  if (!validUsername(username)) throw new Error('请输入 2 至 80 位的管理员账号。');
  const password = await question('管理员密码（至少 12 位）：', true);
  if (password.length < 12 || password.length > 128) throw new Error('密码长度须为 12 至 128 位。');
  if (password !== await question('再次输入密码：', true)) throw new Error('两次输入的密码不同。');
  const salt = randomBytes(32);
  const hash = await scryptAsync(password, salt, 64, SCRYPT_OPTIONS);
  await writeJson(CREDENTIALS_PATH, {
    username,
    passwordHash: 'scrypt:' + salt.toString('hex') + ':' + hash.toString('hex')
  });
  console.log('管理员账户已设置。运行 npm start 启动工作台。修改密码后请重启已有进程。');
}

function serverConfig() {
  const host = process.env.SITE_HOST || '127.0.0.1';
  const port = Number(process.env.SITE_PORT || process.env.PORT || '4173');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('端口必须为 1 至 65535 的整数。');
  const localHosts = ['localhost', '127.0.0.1', '::1'];
  const configuredOrigin = process.env.SITE_ORIGIN;
  const loopback = localHosts.includes(host);
  if (!configuredOrigin && !loopback) throw new Error('对外监听须先配置 HTTPS SITE_ORIGIN。');
  if (configuredOrigin) {
    const url = new URL(configuredOrigin);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
        !(url.protocol === 'https:' || (loopback && url.protocol === 'http:' &&
          ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
      throw new Error('SITE_ORIGIN 应为 HTTPS 站点来源，不含路径。');
    }
    return { host, port, origins: [url.origin], secure: url.protocol === 'https:' };
  }
  const origins = ['127.0.0.1', 'localhost', '[::1]'].map((name) => new URL('http://' + name + ':' + port).origin);
  return { host, port, origins, secure: false };
}

const json = (response, status, body, headers = {}) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  response.end(JSON.stringify(body));
};

async function readBody(request, limit = BODY_LIMIT) {
  if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new RequestError(415, '提交内容须使用 JSON 格式。');
  }
  if (Number(request.headers['content-length']) > limit) {
    request.resume();
    throw new RequestError(413, '提交内容超过大小限制。');
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > limit) {
      request.resume();
      throw new RequestError(413, '提交内容超过大小限制。');
    }
    chunks.push(chunk);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch {
    throw new RequestError(400, '提交内容不是有效的 JSON 对象。');
  }
}

const hash = (value) => createHash('sha256').update(value).digest();

function getSession(request) {
  const token = request.headers.cookie?.match(/(?:^|;\s*)m1ghty_admin_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!token) return null;
  const key = hash(token).toString('hex');
  const expires = sessions.get(key);
  if (!expires) return null;
  if (expires <= Date.now()) {
    sessions.delete(key);
    return null;
  }
  return key;
}

function cookie(value, age, secure) {
  return SESSION_COOKIE + '=' + value + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + age +
    (secure ? '; Secure' : '');
}

async function checkLogin(request, body, credentials) {
  const remote = request.socket.remoteAddress;
  const now = Date.now();
  for (const [address, item] of attempts) {
    if (item.expires <= now) attempts.delete(address);
  }
  let tally = attempts.get(remote);
  if (tally?.count >= 8 || activeLoginChecks >= 4) {
    throw new RequestError(429, '登录尝试过多，请稍后再试。');
  }
  if (!tally) {
    tally = { count: 0, expires: now + LOGIN_WINDOW };
    attempts.set(remote, tally);
  }
  tally.count++;
  const username = body.username;
  const password = body.password;
  if (!validUsername(username) || typeof password !== 'string' || password.length > 128 || !password.length) {
    throw new RequestError(401, '账号或密码不正确。');
  }
  activeLoginChecks++;
  let expected;
  try {
    expected = await scryptAsync(password, credentials.salt, 64, SCRYPT_OPTIONS);
  } finally {
    activeLoginChecks--;
  }
  const passwordOkay = timingSafeEqual(credentials.hash, expected);
  const usernameOkay = timingSafeEqual(hash(credentials.username), hash(username));
  if (!passwordOkay || !usernameOkay) throw new RequestError(401, '账号或密码不正确。');
  attempts.delete(remote);
}

let pendingWrite = Promise.resolve();
function exclusive(operation) {
  const next = pendingWrite.then(operation);
  pendingWrite = next.catch(() => {});
  return next;
}

function requireRevision(revision) {
  if (revision !== content.revision) throw new RequestError(409, '内容已在其他窗口更新，请重新加载后再保存。');
}

async function handleApi(request, response, route, config, credentials, origin) {
  const session = getSession(request);
  const ready = !!credentials;
  const routeKey = request.method + ' ' + route;
  if (request.method !== 'GET' && request.headers.origin !== origin) {
    throw new RequestError(403, '请从当前站点的管理工作台提交操作。');
  }

  if (routeKey === 'GET /api/admin/session') {
    return json(response, 200, {
      authenticated: !!session,
      configured: ready,
      githubConfigured: githubConfigured(),
      ...(session ? { username: credentials.username } : {})
    });
  }

  if (routeKey === 'POST /api/admin/login') {
    if (!ready) throw new RequestError(503, '请先在终端运行 npm run setup 设置管理员账号。');
    await checkLogin(request, await readBody(request, 4 * 1024), credentials);
    if (session) sessions.delete(session);
    const time = Date.now();
    for (const [key, expires] of sessions) {
      if (expires <= time) sessions.delete(key);
    }
    const token = randomBytes(32).toString('hex');
    sessions.set(hash(token).toString('hex'), time + SESSION_TTL * 1000);
    return json(response, 200, { authenticated: true, configured: true, githubConfigured: githubConfigured(), username: credentials.username }, {
      'Set-Cookie': cookie(token, SESSION_TTL, config.secure)
    });
  }

  if (routeKey === 'POST /api/admin/logout') {
    if (session) sessions.delete(session);
    return json(response, 200, { authenticated: false }, { 'Set-Cookie': cookie('', 0, config.secure) });
  }

  if (!session) throw new RequestError(401, '请登录管理工作台。');
  if (routeKey === 'GET /api/admin/content') return json(response, 200, content);
  if (routeKey === 'PUT /api/admin/content') {
    const body = await readBody(request);
    const updated = withRevision(validateContent(body));
    const saved = await exclusive(async () => {
      requireRevision(body.revision);
      if (updated.revision !== content.revision) {
        await writeJson(CONTENT_PATH, { site: updated.site, articles: updated.articles });
        content = updated;
      }
      return content;
    });
    return json(response, 200, saved);
  }
  if (routeKey === 'POST /api/admin/publish') {
    if (!githubConfigured()) throw new RequestError(503, '请先在服务端配置 SITE_GITHUB_TOKEN。');
    const body = await readBody(request, 4 * 1024);
    const result = await exclusive(async () => {
      requireRevision(body.revision);
      try {
        return await publishToGitHub({ site: content.site, articles: content.articles });
      } catch (error) {
        const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 502;
        throw new RequestError(status, error.code ? error.message : 'GitHub 发布失败，请稍后重试。');
      }
    });
    return json(response, 200, result);
  }
  throw new RequestError(404, '接口未找到。');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.wasm': 'application/wasm', '.pck': 'application/octet-stream',
  '.3mf': 'model/3mf', '.stl': 'model/stl', '.blend': 'application/octet-stream',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};
const PUBLIC_DIRS = new Set(['assets', 'vendor', 'src', 'data', 'admin']);
const CAMPUS_DIRS = new Set(['data', 'game', 'legacy-three', 'vendor', 'street', 'atlas.html']);

function within(parent, child) {
  const rel = relative(parent, child);
  return rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel);
}

async function serveStatic(request, response, pathname) {
  if (!['GET', 'HEAD'].includes(request.method)) throw new RequestError(405, '请求方法不支持。');
  if (pathname === '/data/site.json' || pathname === '/data/articles.json') {
    if (request.method === 'HEAD') {
      response.writeHead(200, { 'Content-Type': MIME_TYPES['.json'], 'Cache-Control': 'no-store' }).end();
      return;
    }
    return json(response, 200, pathname === '/data/site.json' ? content.site : content.articles);
  }

  const directIndexes = new Set(['/admin', '/city-twin', '/city-twin/game', '/city-twin/legacy-three']);
  if (directIndexes.has(pathname)) {
    response.writeHead(308, { Location: pathname + '/' }).end();
    return;
  }
  const requested = pathname + (pathname.endsWith('/') ? 'index.html' : '');
  const parts = requested.slice(1).split('/');
  if (parts.some((part) => !part || part.startsWith('.') || /[\\:\u0000-\u001f]/.test(part))) {
    throw new RequestError(404, '页面未找到。');
  }

  const [first, second] = parts;
  const isRoot = requested === '/index.html' || requested === '/world.html';
  const campus = first === 'city-twin';
  if (!isRoot && !PUBLIC_DIRS.has(first) && !(campus && (second === 'index.html' || CAMPUS_DIRS.has(second)))) {
    throw new RequestError(404, '页面未找到。');
  }
  const type = MIME_TYPES[extname(requested).toLowerCase()];
  if (!type) throw new RequestError(404, '页面未找到。');
  const publishedRoot = isRoot ? ROOT : resolve(ROOT, first);
  let filename, stats;
  try {
    filename = await realpath(resolve(ROOT, ...parts));
    const privateDirectory = await realpath(STATE_DIR).catch((error) => {
      if (error.code === 'ENOENT') return STATE_DIR;
      throw error;
    });
    if (!within(publishedRoot, filename) || within(privateDirectory, filename) || (!isRoot && filename === publishedRoot)) {
      throw new RequestError(404, '页面未找到。');
    }
    stats = await stat(filename);
  } catch (error) {
    if (['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code)) throw new RequestError(404, '页面未找到。');
    throw error;
  }
  if (!stats.isFile()) throw new RequestError(404, '页面未找到。');

  response.writeHead(200, {
    'Content-Type': type,
    'Content-Length': stats.size,
    'Cache-Control': first === 'admin' ? 'no-store' : 'no-cache',
    ...(first === 'admin' ? {
      'Content-Security-Policy': "frame-ancestors 'none'",
      'X-Frame-Options': 'DENY'
    } : {}),
    ...(pathname.startsWith('/city-twin/game/') ? {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    } : {})
  });
  if (request.method === 'HEAD') response.end();
  else await pipeline(createReadStream(filename), response);
}

async function start() {
  const config = serverConfig();
  const credentials = await loadCredentials();
  const saved = await optionalJson(CONTENT_PATH);
  content = withRevision(validateContent(saved || {
    site: await readJson(resolve(ROOT, 'data/site.json')),
    articles: await readJson(resolve(ROOT, 'data/articles.json'))
  }));
  const originsByHost = new Map(config.origins.map((origin) => [new URL(origin).host, origin]));
  const server = createServer({ requestTimeout: 20_000, headersTimeout: 10_000 }, async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    try {
      const origin = originsByHost.get(request.headers.host?.toLowerCase());
      if (!origin) throw new RequestError(400, '请使用已配置的站点地址。');
      if (!request.url.startsWith('/') || request.url.startsWith('//')) throw new RequestError(400, '无效请求。');
      let pathname;
      try {
        pathname = decodeURIComponent(new URL(request.url, origin).pathname);
      } catch {
        throw new RequestError(400, '无效的页面地址。');
      }
      if (pathname.startsWith('/api/')) await handleApi(request, response, pathname, config, credentials, origin);
      else await serveStatic(request, response, pathname);
    } catch (error) {
      if (response.headersSent || response.destroyed) {
        response.destroy();
        return;
      }
      if (error instanceof RequestError) json(response, error.status, { error: error.message });
      else {
        console.error('处理请求失败：' + (error.code || error.name));
        json(response, 500, { error: '服务出错，请稍后重试。' });
      }
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, resolve);
  });
  console.log('个人网站 ' + config.origins[0] + '/');
  console.log('管理工作台 ' + config.origins[0] + '/admin/');
  if (!credentials) console.log('尚未设置管理员账号，请先运行 npm run setup。');
}

try {
  if (process.argv[2] === 'setup') await setup();
  else if (process.argv.length === 2) await start();
  else throw new Error('可用命令：npm start 或 npm run setup。');
} catch (error) {
  console.error(error.name === 'AbortError' ? '已取消。' : error.message);
  process.exitCode = 1;
}
