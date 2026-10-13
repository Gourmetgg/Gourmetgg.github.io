import { cp, lstat, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { cv, site, posts } from './content.mjs';

site.origin = (process.env.SITE_URL || 'https://gourmetgg.github.io').replace(/\/$/, '');
const basePath = new URL(site.origin).pathname.replace(/\/$/, '');
// Clear generated articles so deleting a post also removes its public URL.
const projectRoot = await realpath('.');
const postDirectory = `${projectRoot}/posts`;
try {
  const metadata = await lstat(postDirectory);
  const actualDirectory = await realpath(postDirectory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink() || actualDirectory.replaceAll('\\', '/').toLowerCase() !== postDirectory.replaceAll('\\', '/').toLowerCase()) {
    throw new Error('The generated posts directory must remain inside this project.');
  }
  await rm(postDirectory, { recursive: true });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await mkdir('.', { recursive: true });
await cp('static', '.', { recursive: true });
const stylesheet = await readFile('static/style.css', 'utf8');
await writeFile('./style.css', stylesheet.replaceAll("url('/assets/", `url('${basePath}/assets/`));
await writeFile('./.nojekyll', '');

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const date = value => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
const plain = value => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const minutes = post => Math.max(1, Math.ceil(plain(post.body).split(' ').length / 200));
const tagsFor = post => `[ ${post.tags.map(tag => `<a href="/tags/#${encodeURIComponent(tag)}">${escape(tag)}</a>`).join(', ')} ]`;
const yearFilters = [...new Set(posts.map(post => post.date.slice(2, 4)))];

function layout({title = site.name, description = site.description, pathname = '/', current = '', body}) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta name="theme-color" content="#ffffdd"><link rel="canonical" href="${site.origin}${pathname}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="${pathname.startsWith('/posts/') ? 'article' : 'website'}"><meta property="og:url" content="${site.origin}${pathname}"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="preload" href="/assets/inconsolata.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/style.css"><link rel="alternate" type="application/rss+xml" title="Gourmetgg RSS" href="/feed.xml"><script src="/app.js" defer></script></head>
<body><a href="#main" class="skip-link">Skip to content</a><div class="container"><header class="navbar"><a class="site-title" href="/" aria-label="Gourmetgg home">Gourmetgg</a><nav aria-label="Main navigation"><a href="/cv/" ${current === 'cv' ? 'aria-current="page"' : ''}>CV</a><a href="/tags/" ${current === 'tags' ? 'aria-current="page"' : ''}>Tags</a><a href="/about/" ${current === 'about' ? 'aria-current="page"' : ''}>About</a></nav></header><main id="main">${body}</main><footer class="footer"><p>notes by Gourmetgg.</p><a href="/feed.xml">rss ↗</a></footer></div></body></html>`;
}

async function page(pathname, html) {
  const directory = `.${pathname}`;
  await mkdir(directory, {recursive: true});
  await writeFile(`${directory}index.html`, html.replace(/(href|src)="\/(?!\/)/g, `$1="${basePath}/`));
}

const cards = posts.map(post => `<article class="post-card" data-year="${post.date.slice(2, 4)}" data-post="${post.slug}"><h2 class="post-title"><a href="/posts/${post.slug}/">${escape(post.title)}</a></h2><div class="post-details"><time datetime="${post.date}">${date(post.date)}</time><div class="post-tags">${tagsFor(post)}</div></div><p class="post-subtitle">${escape(post.subtitle)}</p></article>`).join('\n');
const filters = [...yearFilters, 'all', 'fav'].map(filter => `<button data-filter="${filter}" aria-pressed="false" aria-label="${filter === 'fav' ? 'Favorite posts' : filter === 'all' ? 'All posts' : `Posts from 20${filter}`}">${filter}</button>`).join('<span aria-hidden="true" class="vertical-bar">|</span>');
const emptyContent = posts.length ? '<p>No favorites yet. Save a post while reading to find it here.</p><button id="show-all">view all posts →</button>' : '<p>No posts yet.</p><a href="/cv/">view my cv →</a>';
await page('/', layout({body: `<div class="filter-bar"><div class="filter-options" role="group" aria-label="Filter posts">${filters}</div><div class="filter-description"><span aria-hidden="true">&gt;&gt;</span><span><span id="filter-description">all posts</span><span class="cursor" aria-hidden="true"></span></span></div></div><div id="posts-container">${cards}</div><div id="empty-state" class="empty-state"${posts.length ? ' hidden' : ''}>${emptyContent}</div><p class="sample-note"><span id="post-count" aria-live="polite">${posts.length} posts</span></p>`}));

for (const [index, post] of posts.entries()) {
  const next = posts[index + 1];
  await page(`/posts/${post.slug}/`, layout({title: `${post.title} | Gourmetgg`, description: post.subtitle, pathname: `/posts/${post.slug}/`, body: `<a class="back-link" href="/">← all notes</a><article><header class="article-header"><h1>${escape(post.title)}</h1><p class="dek">${escape(post.subtitle)}</p><div class="byline"><time datetime="${post.date}">${date(post.date)}</time><span>${minutes(post)} min read</span><span>${tagsFor(post)}</span></div></header><div class="article-body">${post.body}</div><div class="article-end"><button id="favorite-button" data-slug="${post.slug}" aria-pressed="false">[save to favorites]</button><p id="favorite-feedback" aria-live="polite">original sample writing</p></div></article>${next ? `<div class="next-post"><span>read next</span><a href="/posts/${next.slug}/">${escape(next.title)} →</a></div>` : ''}`}));
}

await page('/about/', layout({title: 'about | Gourmetgg', pathname: '/about/', current: 'about', body: `<a class="back-link" href="/">← all notes</a><h1 class="page-heading">a little about me</h1><div class="article-body about-body"><p>I'm ${escape(cv.name)}, a student at ${escape(cv.education.university)} (${escape(cv.education.period)}).</p><p>This is my space for notes on technology and everyday life.</p><p>My education and completed coursework are listed in my <a href="/cv/">CV</a>.</p><p><a href="${cv.github}">find me on GitHub ↗</a></p></div>`}));

const coursework = cv.coursework.map(course => `<li class="cv-course"><div class="cv-course-top"><a href="${escape(course.url)}">${escape(course.code)} ↗</a><span class="cv-meta">${escape(course.institution)}${course.term ? ` · ${escape(course.term)}` : ''}</span></div><p>${escape(course.title)}</p></li>`).join('');
await page('/cv/', layout({title: `${cv.name} — CV | Gourmetgg`, description: `${cv.name} — ${cv.education.university}, ${cv.education.period}. Education and completed coursework.`, pathname: '/cv/', current: 'cv', body: `<a class="back-link" href="/">← all notes</a><article class="cv"><header><p class="cv-eyebrow">curriculum vitae</p><h1 class="page-heading">${escape(cv.name)}</h1><p class="cv-intro">${escape(cv.education.university)}</p></header><section class="cv-section" aria-labelledby="education"><h2 id="education">education</h2><div class="cv-education"><p>${escape(cv.education.university)}</p><span class="cv-meta">${escape(cv.education.period)}</span></div></section><section class="cv-section" aria-labelledby="coursework"><h2 id="coursework">completed coursework</h2><ul class="cv-courses">${coursework}</ul></section><p class="cv-github"><a href="${cv.github}">GitHub ↗</a></p></article>`}));

const topics = [...new Set(posts.flatMap(post => post.tags))].sort();
await page('/tags/', layout({title: 'tags | Gourmetgg', pathname: '/tags/', current: 'tags', body: `<a class="back-link" href="/">← all notes</a><h1 class="page-heading">follow a thread</h1><p class="post-subtitle">${topics.length ? "different ways into the same notebook." : "No tags yet."}</p><nav class="topic-list" aria-label="Topics">${topics.map(tag => `<a href="#${encodeURIComponent(tag)}">[${escape(tag)}]</a>`).join('')}</nav>${topics.map(tag => `<section aria-labelledby="${tag}"><h2 class="tag-heading" id="${tag}">${escape(tag)} <span class="post-subtitle">(${posts.filter(post => post.tags.includes(tag)).length})</span></h2>${posts.filter(post => post.tags.includes(tag)).map(post => `<p class="tag-entry"><a href="/posts/${post.slug}/">${escape(post.title)}</a><time datetime="${post.date}">${date(post.date)}</time></p>`).join('')}</section>`).join('')}`}));

await writeFile('./feed.xml', `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Gourmetgg</title><link>${site.origin}/</link><description>${escape(site.description)}</description><language>en</language>${posts.map(post => `<item><title>${escape(post.title)}</title><link>${site.origin}/posts/${post.slug}/</link><guid>${site.origin}/posts/${post.slug}/</guid><description>${escape(post.subtitle)}</description><pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`);
await writeFile('./robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\n`);
await writeFile('./sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/about/', '/cv/', '/tags/', ...posts.map(post => `/posts/${post.slug}/`)].map(url => `<url><loc>${site.origin}${url}</loc></url>`).join('')}</urlset>`);

// Check every local HTML link and asset in the generated site before packaging.
const { existsSync, readdirSync } = await import('node:fs');
const { join } = await import('node:path');
let checked = 0;
async function verify(directory) {
  for (const item of readdirSync(directory, {withFileTypes: true})) {
    if (item.name.startsWith('.') || item.name === 'static') continue;
    const path = join(directory, item.name);
    if (item.isDirectory()) { await verify(path); continue; }
    if (!item.name.endsWith('.html')) continue;
    const html = await readFile(path, 'utf8');
    for (const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)) {
      if (basePath && !match[1].startsWith(`${basePath}/`)) throw new Error(`Reference escaped the site base path: ${match[1]}`);
      const target = join('.', match[1].slice(basePath.length));
      if (!existsSync(target)) throw new Error(`Broken local reference in ${path}: ${match[1]}`);
      checked++;
    }
  }
}
await verify('.');
console.log(`Built ${posts.length + 4} pages; verified ${checked} local links and assets.`);
