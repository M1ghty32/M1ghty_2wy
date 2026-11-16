import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function record(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestError(400, field + '格式有误。');
  }
  return value;
}

function text(value, field, max, required = false) {
  if (typeof value !== 'string' || value.includes('\u0000') || value.length > max) {
    throw new RequestError(400, field + '须为不超过 ' + max + ' 字的文本。');
  }
  const trimmed = value.replace(/\r\n?/g, '\n').trim();
  if (required && !trimmed) throw new RequestError(400, field + '不能为空。');
  return trimmed;
}

function list(value, field, max, transform) {
  if (!Array.isArray(value) || value.length > max) {
    throw new RequestError(400, field + '最多可填写 ' + max + ' 项。');
  }
  return value.map(transform);
}

function webUrl(value) {
  const link = text(value, 'GitHub 链接', 2000);
  if (!link) return '';
  try {
    const url = new URL(link);
    if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) {
      return url.href;
    }
  } catch {
    // Invalid links share one field error.
  }
  throw new RequestError(400, 'GitHub 链接须以 http:// 或 https:// 开头。');
}

export function validateContent(value) {
  const input = record(value, '内容');
  const profile = record(input.site, '个人简历');
  const contact = record(profile.links, '联系方式');
  const email = text(contact.email, '邮箱', 160);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new RequestError(400, '请填写有效的邮箱地址。');
  }

  const site = {
    name: text(profile.name, '昵称', 80, true),
    title: text(profile.title, '网站标题', 160, true),
    tagline: text(profile.tagline, '职业简介', 200),
    bio: text(profile.bio, '个人介绍', 1200),
    motto: text(profile.motto, '座右铭', 200),
    location: text(profile.location, '所在地区', 100),
    status: text(profile.status, '近况', 200),
    focus: list(profile.focus, '关注方向', 8, (item) => text(item, '关注方向', 80, true)),
    skills: list(profile.skills, '技能', 16, (item) => {
      const skill = record(item, '技能');
      const color = text(skill.color, '技能颜色', 20) || 'sky';
      if (!/^[a-z]+(?:-[a-z]+)*$/.test(color)) throw new RequestError(400, '技能颜色格式有误。');
      return { name: text(skill.name, '技能名称', 80, true), level: text(skill.level, '熟练度', 40), color };
    }),
    timeline: list(profile.timeline, '履历', 16, (item) => {
      const entry = record(item, '履历');
      return {
        year: text(entry.year, '履历时间', 30),
        title: text(entry.title, '履历标题', 100, true),
        desc: text(entry.desc, '履历说明', 300)
      };
    }),
    links: { github: webUrl(contact.github), email }
  };

  const ids = new Set();
  const articles = list(input.articles, '文章', 500, (item) => {
    const article = record(item, '文章');
    const id = text(article.id, '文章 ID', 80, true);
    if (!/^[\w.:-]+$/.test(id) || ids.has(id)) {
      throw new RequestError(400, '文章 ID 格式有误或重复。');
    }
    ids.add(id);
    const date = text(article.date, '发布日期', 40, true);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date) {
      throw new RequestError(400, '请选择有效的文章发布日期。');
    }
    return {
      id,
      cat: text(article.cat, '文章分类', 80) || '极客随笔',
      title: text(article.title, '文章标题', 180, true),
      body: text(article.body, '文章正文', 6000, true),
      date
    };
  });
  return { site, articles };
}

export const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

export async function writeJson(file, value) {
  const directory = dirname(file);
  const temp = file + '.' + randomBytes(8).toString('hex') + '.tmp';
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    await writeFile(temp, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    await rename(temp, file);
  } finally {
    await unlink(temp).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  }
}

export function withRevision(content) {
  const revision = createHash('sha256').update(JSON.stringify(content)).digest('hex');
  return { ...content, revision };
}
