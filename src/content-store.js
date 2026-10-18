/**
 * content-store.js
 * 公共 JSON 内容 + 本机草稿的集合级合并层。
 *
 * 设计原则：
 * - 公共数据只读，来自 data/*.json；
 * - 网页编辑写入 localStorage，按集合分开保存；
 * - 合并时以 id 为键，草稿覆盖同 id 公共条目，删除公共条目只记录 deletedIds；
 * - 导入/导出携带 schemaVersion，导入只更新提供的集合，不覆盖其他集合。
 */

import {
  FALLBACK_SITE,
  FALLBACK_PROJECTS,
  FALLBACK_ARTICLES,
  FALLBACK_NOTES,
  FALLBACK_GUESTBOOK,
  FALLBACK_TOOLS,
  FALLBACK_LIBRARY
} from './content/defaults.js';

export const COLLECTIONS = ['projects', 'articles', 'notes', 'guestbook', 'tools', 'library'];

export const COLLECTION_META = {
  projects: { label: '项目', file: 'projects.json', fallback: FALLBACK_PROJECTS, idPrefix: 'p' },
  articles: { label: '文章', file: 'articles.json', fallback: FALLBACK_ARTICLES, idPrefix: 'a' },
  notes: { label: '随记', file: 'notes.json', fallback: FALLBACK_NOTES, idPrefix: 'note' },
  guestbook: { label: '留言', file: 'guestbook.json', fallback: FALLBACK_GUESTBOOK, idPrefix: 'guest' },
  tools: { label: '工具', file: 'tools.json', fallback: FALLBACK_TOOLS, idPrefix: 'tool' },
  library: { label: '素材', file: 'library.json', fallback: FALLBACK_LIBRARY, idPrefix: 'library' }
};

const DRAFT_PREFIX = 'm1ghty_2wy_draft_v2_';
const LEGACY_KEYS = {
  projects: 'm1ghty_2wy_room_projects_v1',
  articles: 'm1ghty_2wy_room_articles_v1',
  notes: 'm1ghty_2wy_room_notes_v1',
  guestbook: 'm1ghty_2wy_room_public_notes_v1',
  tools: 'm1ghty_2wy_room_tools_v1',
  library: 'm1ghty_2wy_room_library_v1'
};
const ALL_LEGACY_KEYS = Object.values(LEGACY_KEYS);
export const CONTENT_SCHEMA_VERSION = 2;
const MAX_TEXT = 6000;
const MAX_IMPORT_ITEMS = 500;

function makeMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    key: (index) => Array.from(map.keys())[index] ?? null,
    get length() { return map.size; }
  };
}

function resolveStorage(storage) {
  try {
    if (storage && typeof storage.getItem === 'function') return storage;
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch (error) {
    // 隐私模式或沙箱可能拒绝访问 localStorage。
  }
  return makeMemoryStorage();
}

function cleanText(value, maxLength = MAX_TEXT) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, maxLength);
}

function cleanId(value, prefix) {
  const raw = cleanText(value, 80).replace(/[^\w.:-]/g, '-').replace(/-{2,}/g, '-');
  if (raw) return raw;
  const random = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function cleanUrl(value) {
  const url = cleanText(value, 2000);
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.href;
  } catch (error) {
    return '';
  }
}

function asTags(value) {
  if (!Array.isArray(value)) return [];
  return value.map((tag) => cleanText(tag, 24)).filter(Boolean).slice(0, 12);
}

function requireText(value, field, { required = true, max = 160 } = {}) {
  const text = cleanText(value, max);
  if (required && !text) throw new Error(`${field}不能为空`);
  return text;
}

/**
 * 将任意来源条目规整为标准字段。未知字段会被丢弃，避免把不可信结构带进 UI。
 */
export function normalizeItem(collection, raw, options = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('条目必须是对象');
  }
  const prefix = COLLECTION_META[collection]?.idPrefix || 'item';
  const id = cleanId(raw.id, prefix);
  const base = { id };

  if (collection === 'projects') {
    return {
      ...base,
      ver: requireText(raw.ver, '版本标签', { required: false, max: 80 }) || 'NEW',
      name: requireText(raw.name, '项目名称', { max: 120 }),
      desc: requireText(raw.desc, '项目描述', { max: 800 }),
      date: requireText(raw.date, '日期', { required: false, max: 40 }) || 'JUST NOW'
    };
  }

  if (collection === 'articles') {
    return {
      ...base,
      cat: requireText(raw.cat, '文章分类', { required: false, max: 80 }) || '极客随笔',
      title: requireText(raw.title, '文章标题', { max: 180 }),
      body: requireText(raw.body, '文章正文', { max: MAX_TEXT }),
      date: requireText(raw.date, '日期', { required: false, max: 40 }) || new Date().toISOString().slice(0, 10)
    };
  }

  if (collection === 'notes' || collection === 'guestbook') {
    return {
      ...base,
      title: requireText(raw.title, collection === 'notes' ? '随记标题' : '留言标题', { max: 120 }),
      body: requireText(raw.body, collection === 'notes' ? '随记内容' : '留言内容', { max: 1200 }),
      date: requireText(raw.date, '日期', { required: false, max: 40 }) || new Date().toISOString().slice(0, 10),
      mood: requireText(raw.mood, '状态标签', { required: false, max: 32 }) || (collection === 'notes' ? 'NOTE' : 'GUEST'),
      author: requireText(raw.author, '昵称', { required: false, max: 40 }) || (collection === 'guestbook' ? '匿名访客' : '')
    };
  }

  if (collection === 'tools') {
    const url = cleanUrl(raw.url);
    if (!url) throw new Error('工具链接必须是 http:// 或 https:// 地址');
    return {
      ...base,
      name: requireText(raw.name, '工具名称', { max: 100 }),
      category: requireText(raw.category, '工具分类', { max: 48 }),
      description: requireText(raw.description, '工具描述', { max: 500 }),
      url,
      tags: asTags(raw.tags),
      favorite: Boolean(raw.favorite)
    };
  }

  if (collection === 'library') {
    const type = ['bookmark', 'model', 'idea'].includes(raw.type) ? raw.type : 'idea';
    const rawUrl = cleanText(raw.url, 2000);
    const url = cleanUrl(rawUrl);
    if (rawUrl && !url) throw new Error('素材链接必须是 http:// 或 https:// 地址');
    return {
      ...base,
      type,
      title: requireText(raw.title, '素材名称', { max: 120 }),
      description: requireText(raw.description, '素材描述', { max: 500 }),
      url,
      tags: asTags(raw.tags)
    };
  }

  throw new Error(`未知集合：${collection}`);
}

export function normalizeCollection(collection, rawList) {
  if (!Array.isArray(rawList)) throw new Error('集合必须是数组');
  const items = [];
  const errors = [];
  const seen = new Set();
  rawList.slice(0, MAX_IMPORT_ITEMS).forEach((raw, index) => {
    try {
      const item = normalizeItem(collection, raw);
      if (seen.has(item.id)) item.id = `${item.id}-${index}`;
      seen.add(item.id);
      items.push(item);
    } catch (error) {
      errors.push({ index, message: error.message });
    }
  });
  return { items, errors };
}

function validateSite(raw) {
  if (!raw || typeof raw !== 'object') return { ...FALLBACK_SITE };
  const result = { ...FALLBACK_SITE };
  result.name = cleanText(raw.name, 80) || result.name;
  result.title = cleanText(raw.title, 160) || result.title;
  result.tagline = cleanText(raw.tagline, 200) || result.tagline;
  result.bio = cleanText(raw.bio, 1200) || result.bio;
  result.motto = cleanText(raw.motto, 200) || result.motto;
  result.location = cleanText(raw.location, 100) || result.location;
  result.status = cleanText(raw.status, 200) || result.status;
  if (Array.isArray(raw.focus)) result.focus = raw.focus.map((x) => cleanText(x, 80)).filter(Boolean).slice(0, 8);
  if (Array.isArray(raw.skills)) {
    result.skills = raw.skills
      .filter((x) => x && typeof x === 'object')
      .map((x) => ({ name: cleanText(x.name, 80), level: cleanText(x.level, 40), color: cleanText(x.color, 20) }))
      .filter((x) => x.name)
      .slice(0, 16);
  }
  if (Array.isArray(raw.timeline)) {
    result.timeline = raw.timeline
      .filter((x) => x && typeof x === 'object')
      .map((x) => ({ year: cleanText(x.year, 30), title: cleanText(x.title, 100), desc: cleanText(x.desc, 300) }))
      .filter((x) => x.title)
      .slice(0, 16);
  }
  if (raw.links && typeof raw.links === 'object') {
    result.links = {
      github: cleanUrl(raw.links.github),
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText(raw.links.email, 160)) ? cleanText(raw.links.email, 160) : ''
    };
  }
  return result;
}

function mergeCollection(publicItems, draft) {
  const deleted = new Set(draft.deletedIds);
  const upserts = new Map(draft.items.map((item) => [item.id, item]));
  const publicIds = new Set(publicItems.map((item) => item.id));
  const merged = [];

  // 本机新增的内容放在最前面（最新发布的优先），公共内容保持仓库顺序。
  for (const item of draft.items) {
    if (!publicIds.has(item.id)) merged.push(item);
  }
  for (const item of publicItems) {
    if (deleted.has(item.id)) continue;
    merged.push(upserts.get(item.id) || item);
  }
  return merged;
}

async function fetchJson(fetchImpl, url) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 9000) : null;
  try {
    const response = await fetchImpl(url, {
      cache: 'no-cache',
      signal: controller ? controller.signal : undefined,
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function createContentStore(options = {}) {
  const storage = resolveStorage(options.storage);
  const fetchImpl = options.fetchImpl || (typeof fetch === 'function' ? fetch.bind(window) : null);
  const basePath = options.basePath || '';
  const listeners = new Set();
  const publicData = {
    site: null,
    projects: [],
    articles: [],
    notes: [],
    guestbook: [],
    tools: [],
    library: []
  };
  const drafts = {};
  let loaded = false;
  let usingFallback = false;
  let storageError = '';
  let loadError = '';

  const draftKey = (collection) => `${DRAFT_PREFIX}${collection}`;
  const emptyDraft = () => ({ items: [], deletedIds: [] });

  function safeGet(key) {
    try {
      return storage.getItem(key);
    } catch (error) {
      storageError = '本机存储不可用，本次编辑只在内存中保留。';
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      storageError = '本机存储写入失败（可能空间不足或被浏览器禁用），本次编辑只在内存中保留。';
      return false;
    }
  }

  function safeRemove(key) {
    try {
      storage.removeItem(key);
    } catch (error) {
      storageError = '本机存储无法修改。';
    }
  }

  function readDraft(collection) {
    const key = draftKey(collection);
    const raw = safeGet(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed.items) ? parsed.items : [];
        const normalized = normalizeCollection(collection, items).items;
        const deletedIds = Array.isArray(parsed.deletedIds)
          ? parsed.deletedIds.map((id) => cleanText(id, 80)).filter(Boolean)
          : [];
        return { items: normalized, deletedIds: Array.from(new Set(deletedIds)) };
      } catch (error) {
        loadError = `本机草稿（${COLLECTION_META[collection].label}）无法解析，已忽略。`;
      }
    }

    // 兼容旧版整组保存的 localStorage 键：转换为集合级 upsert。
    const legacyRaw = safeGet(LEGACY_KEYS[collection]);
    if (legacyRaw) {
      try {
        const parsed = JSON.parse(legacyRaw);
        if (Array.isArray(parsed)) {
          const normalized = normalizeCollection(collection, parsed).items;
          return { items: normalized, deletedIds: [] };
        }
      } catch (error) {
        loadError = `旧版本机草稿（${COLLECTION_META[collection].label}）无法迁移。`;
      }
    }
    return emptyDraft();
  }

  function loadDrafts() {
    for (const collection of COLLECTIONS) {
      drafts[collection] = readDraft(collection);
    }
  }

  function persistDraft(collection) {
    const ok = safeSet(draftKey(collection), drafts[collection]);
    emit({ type: 'draft-saved', collection, ok, storageError });
    return ok;
  }

  function emit(event) {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[content-store] listener failed', error);
      }
    }
  }

  async function init() {
    loadDrafts();
    if (!fetchImpl) {
      usingFallback = true;
      useFallbackForAll();
      loaded = true;
      emit({ type: 'ready' });
      return api;
    }

    const entries = await Promise.all(
      COLLECTIONS.map(async (collection) => {
        const file = COLLECTION_META[collection].file;
        try {
          const raw = await fetchJson(fetchImpl, `${basePath}data/${file}`);
          const normalized = normalizeCollection(collection, raw);
          if (normalized.errors.length) {
            loadError = `${file} 中有 ${normalized.errors.length} 条内容字段不完整，已跳过。`;
          }
          return [collection, normalized.items];
        } catch (error) {
          return [collection, null];
        }
      })
    );

    let site = null;
    try {
      site = validateSite(await fetchJson(fetchImpl, `${basePath}data/site.json`));
    } catch (error) {
      site = null;
    }

    for (const [collection, items] of entries) {
      if (items && items.length) {
        publicData[collection] = items;
      } else {
        publicData[collection] = COLLECTION_META[collection].fallback.map((item) => normalizeItem(collection, item));
        usingFallback = true;
      }
    }
    if (site) {
      publicData.site = site;
    } else {
      publicData.site = validateSite(FALLBACK_SITE);
      usingFallback = true;
    }

    loaded = true;
    emit({ type: 'ready' });
    return api;
  }

  function useFallbackForAll() {
    publicData.site = validateSite(FALLBACK_SITE);
    for (const collection of COLLECTIONS) {
      publicData[collection] = COLLECTION_META[collection].fallback.map((item) => normalizeItem(collection, item));
    }
  }

  function ensureLoaded() {
    if (!loaded) throw new Error('内容尚未加载完成');
  }

  function get(collection) {
    ensureLoaded();
    if (!COLLECTIONS.includes(collection)) return [];
    return mergeCollection(publicData[collection], drafts[collection] || emptyDraft());
  }

  function getSite() {
    return publicData.site || validateSite(FALLBACK_SITE);
  }

  function getItem(collection, id) {
    return get(collection).find((item) => item.id === id) || null;
  }

  function add(collection, raw) {
    ensureLoaded();
    if (!COLLECTIONS.includes(collection)) throw new Error('未知内容集合');
    const item = normalizeItem(collection, raw);
    if (collection === 'notes' || collection === 'guestbook') {
      if (!item.date) item.date = new Date().toISOString().slice(0, 10);
    }
    const draft = drafts[collection];
    const existingIndex = draft.items.findIndex((entry) => entry.id === item.id);
    if (existingIndex >= 0) {
      throw new Error('内容 id 已存在，请稍后重试');
    }
    draft.items.unshift(item);
    persistDraft(collection);
    emit({ type: 'change', collection, action: 'add', item });
    return item;
  }

  function update(collection, id, patch) {
    ensureLoaded();
    const current = getItem(collection, id);
    if (!current) throw new Error('要修改的内容不存在');
    const next = normalizeItem(collection, { ...current, ...patch, id });
    const draft = drafts[collection];
    const index = draft.items.findIndex((entry) => entry.id === id);
    if (index >= 0) draft.items[index] = next;
    else draft.items.unshift(next);
    persistDraft(collection);
    emit({ type: 'change', collection, action: 'update', item: next });
    return next;
  }

  function remove(collection, id) {
    ensureLoaded();
    const draft = drafts[collection];
    draft.items = draft.items.filter((entry) => entry.id !== id);
    if (publicData[collection].some((entry) => entry.id === id) && !draft.deletedIds.includes(id)) {
      draft.deletedIds.push(id);
    }
    persistDraft(collection);
    emit({ type: 'change', collection, action: 'remove', id });
  }

  function restore(collection) {
    drafts[collection] = emptyDraft();
    persistDraft(collection);
    emit({ type: 'change', collection, action: 'restore' });
  }

  function resetCollection(collection) {
    safeRemove(draftKey(collection));
    safeRemove(LEGACY_KEYS[collection]);
    drafts[collection] = emptyDraft();
    emit({ type: 'change', collection, action: 'reset' });
  }

  function resetAllDrafts() {
    for (const collection of COLLECTIONS) {
      safeRemove(draftKey(collection));
      drafts[collection] = emptyDraft();
    }
    for (const key of ALL_LEGACY_KEYS) safeRemove(key);
    emit({ type: 'change', action: 'reset-all' });
  }

  function isLocal(collection, id) {
    const draft = drafts[collection];
    return Boolean(draft && draft.items.some((entry) => entry.id === id));
  }

  function isPublicItem(collection, id) {
    return publicData[collection].some((entry) => entry.id === id);
  }

  function getDraftItems(collection) {
    const draft = drafts[collection];
    if (!draft) return [];
    return draft.items.map((item) => ({ ...item, __localKind: isPublicItem(collection, item.id) ? 'override' : 'new' }));
  }

  /**
   * 放弃某条本机修改但保留公共内容。
   * 与 remove() 不同，不会把公共 id 写入 deletedIds。
   */
  function discardDraft(collection, id) {
    ensureLoaded();
    const draft = drafts[collection];
    if (!draft) return;
    draft.items = draft.items.filter((entry) => entry.id !== id);
    persistDraft(collection);
    emit({ type: 'change', collection, action: 'discard', id });
  }

  function countDraft(collection) {
    const draft = drafts[collection];
    if (!draft) return { upserts: 0, deleted: 0, total: 0 };
    return { upserts: draft.items.length, deleted: draft.deletedIds.length, total: draft.items.length + draft.deletedIds.length };
  }

  function draftSummary() {
    const summary = {};
    for (const collection of COLLECTIONS) summary[collection] = countDraft(collection);
    return summary;
  }

  function hasDrafts() {
    return COLLECTIONS.some((collection) => countDraft(collection).total > 0);
  }

  function exportBundle() {
    ensureLoaded();
    const bundle = {
      schemaVersion: CONTENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      note: '此文件由站内内容控制台导出。公开前请将对应数组写入 data/ 并提交仓库；留言板为静态站，不接受跨访客实时写入。',
      site: getSite(),
      projects: get('projects'),
      articles: get('articles'),
      notes: get('notes'),
      guestbook: get('guestbook'),
      tools: get('tools'),
      library: get('library')
    };
    return bundle;
  }

  function parseImportPayload(payload) {
    if (Array.isArray(payload)) throw new Error('请在导出对象中包含集合名称，例如 { "projects": [...] }');
    if (!payload || typeof payload !== 'object') throw new Error('文件内容不是 JSON 对象');
    const source = payload.collections && typeof payload.collections === 'object' ? payload.collections : payload;
    const alias = { publicNotes: 'guestbook' };
    const recognized = {};
    for (const key of Object.keys(source)) {
      const collection = alias[key] || key;
      if (!COLLECTIONS.includes(collection)) continue;
      if (source[key] === undefined) continue;
      recognized[collection] = source[key];
    }
    return recognized;
  }

  function importBundle(payload) {
    ensureLoaded();
    const recognized = parseImportPayload(payload);
    const keys = Object.keys(recognized);
    if (!keys.length) throw new Error('没有找到可导入的 projects / articles / notes / guestbook / tools / library 集合');
    const report = { imported: {}, skipped: {}, errors: [], storageError: '' };
    for (const collection of keys) {
      const normalized = normalizeCollection(collection, recognized[collection]);
      if (!normalized.items.length && normalized.errors.length) {
        report.errors.push(`${COLLECTION_META[collection].label}: 没有有效条目`);
        continue;
      }
      const draft = drafts[collection];
      let importedCount = 0;
      for (const item of normalized.items) {
        const index = draft.items.findIndex((entry) => entry.id === item.id);
        if (index >= 0) draft.items[index] = item;
        else draft.items.unshift(item);
        draft.deletedIds = draft.deletedIds.filter((id) => id !== item.id);
        importedCount += 1;
      }
      report.imported[collection] = importedCount;
      report.skipped[collection] = normalized.errors.length;
      if (normalized.errors.length) {
        report.errors.push(`${COLLECTION_META[collection].label}: 跳过 ${normalized.errors.length} 条字段不完整内容`);
      }
      persistDraft(collection);
    }
    report.storageError = storageError;
    emit({ type: 'change', action: 'import', report });
    return report;
  }

  const api = {
    init,
    get,
    getSite,
    getItem,
    add,
    update,
    remove,
    restore,
    resetCollection,
    resetAllDrafts,
    isLocal,
    isPublicItem,
    getDraftItems,
    discardDraft,
    countDraft,
    draftSummary,
    hasDrafts,
    exportBundle,
    importBundle,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getStatus() {
      return {
        loaded,
        usingFallback,
        storageError,
        loadError,
        drafts: draftSummary(),
        collections: COLLECTIONS.map((collection) => ({
          id: collection,
          label: COLLECTION_META[collection].label,
          publicCount: publicData[collection].length,
          total: get(collection).length
        }))
      };
    }
  };

  return api;
}
