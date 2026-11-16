const repository = 'M1ghty32/M1ghty_2wy';
const githubApi = 'https://api.github.com/repos/' + repository;
const headRef = '/git/ref/heads/main';
const updateRef = '/git/refs/heads/main';
const publishTimeoutMs = 15_000;

function publishError(code, message, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function remoteError(status, method) {
  if ([401, 403, 404].includes(status)) {
    return publishError('AUTHORIZATION', 'GitHub 拒绝访问，请检查服务端令牌和仓库权限。', 502);
  }
  if (status === 409 || (method === 'PATCH' && status === 422)) {
    return publishError('CONFLICT', 'GitHub 拒绝更新 main 分支，请刷新后重试或检查分支规则。', 409);
  }
  if (status === 429) {
    return publishError('GITHUB_REQUEST_FAILED', 'GitHub 请求过于频繁，请稍后重试。', 503);
  }
  return publishError('GITHUB_REQUEST_FAILED', 'GitHub 发布请求失败，请稍后重试。', 502);
}

function requestError(signal) {
  if (signal.aborted) {
    return publishError('TIMEOUT', 'GitHub 请求超时，请刷新后确认发布结果。', 504);
  }
  return publishError('GITHUB_REQUEST_FAILED', '无法完成 GitHub 请求，请稍后重试。', 502);
}

function requireSha(sha) {
  if (typeof sha !== 'string' || !/^[a-f0-9]{40}$/i.test(sha)) {
    throw publishError('GITHUB_REQUEST_FAILED', 'GitHub 返回了无效的提交或目录标识。', 502);
  }
  return sha;
}

export function githubConfigured() {
  return Boolean(process.env.SITE_GITHUB_TOKEN?.trim());
}

export async function publishToGitHub({ site, articles }, { fetchImpl = globalThis.fetch } = {}) {
  const token = process.env.SITE_GITHUB_TOKEN?.trim();
  if (!token) {
    throw publishError('NOT_CONFIGURED', '服务端尚未配置 GitHub 发布令牌。', 503);
  }
  if (!site || typeof site !== 'object' || Array.isArray(site) || !Array.isArray(articles)) {
    throw publishError('INVALID_CONTENT', '站点内容或文章列表格式无效。', 400);
  }

  let entries;
  try {
    entries = [
      { path: 'data/site.json', content: JSON.stringify(site, null, 2) + '\n' },
      { path: 'data/articles.json', content: JSON.stringify(articles, null, 2) + '\n' },
    ].map(entry => ({ ...entry, mode: '100644', type: 'blob' }));
  } catch {
    throw publishError('INVALID_CONTENT', '站点内容或文章列表无法转换为 JSON。', 400);
  }

  const signal = AbortSignal.timeout(publishTimeoutMs);
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  async function request(path, method = 'GET', data) {
    let response;
    try {
      response = await fetchImpl(githubApi + path, {
        method,
        headers,
        signal,
        redirect: 'error',
        body: data === undefined ? undefined : JSON.stringify(data),
      });
    } catch {
      throw requestError(signal);
    }
    if (!response.ok) {
      throw remoteError(response.status, method);
    }
    try {
      return await response.json();
    } catch {
      throw requestError(signal);
    }
  }

  const readHead = async () => requireSha((await request(headRef))?.object?.sha);
  const baseCommit = await readHead();
  const baseTree = requireSha((await request('/git/commits/' + baseCommit))?.tree?.sha);
  const nextTree = requireSha((await request('/git/trees', 'POST', {
    base_tree: baseTree,
    tree: entries,
  }))?.sha);
  const unchanged = nextTree === baseTree;
  let commit = baseCommit;
  if (!unchanged) {
    commit = requireSha((await request('/git/commits', 'POST', {
      message: 'Update site profile and articles',
      parents: [baseCommit],
      tree: nextTree,
    }))?.sha);
  }

  if (await readHead() !== baseCommit) {
    throw publishError('CONFLICT', 'GitHub 上的 main 分支已更新，请刷新后重试。', 409);
  }
  const url = 'https://github.com/' + repository + '/commit/' + commit;
  if (unchanged) return { commit, url, unchanged: true };

  const updated = await request(updateRef, 'PATCH', { sha: commit, force: false });
  if (requireSha(updated?.object?.sha) !== commit) {
    throw publishError('GITHUB_REQUEST_FAILED', 'GitHub 返回的分支提交与发布提交不一致。', 502);
  }
  return { commit, url };
}
