import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const LABEL = 'reactions';

export const issueTitle = (slug) => `post: ${slug}`;

export function plan(existing, slugs) {
  const byTitle = new Map(existing.map((issue) => [issue.title, issue.number]));
  const map = {};
  const missing = [];
  for (const slug of slugs) {
    const number = byTitle.get(issueTitle(slug));
    if (number) map[slug] = number;
    else missing.push(slug);
  }
  return { map, missing };
}

async function api(fetchImpl, token, method, path, body) {
  const response = await fetchImpl(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response;
}

async function listIssues(fetchImpl, token, repo) {
  const issues = [];
  for (let page = 1; page <= 10; page++) {
    const response = await api(fetchImpl, token, 'GET', `/repos/${repo}/issues?state=all&labels=${LABEL}&per_page=100&page=${page}`);
    if (!response.ok) throw new Error(`listing issues failed: ${response.status}`);
    const batch = await response.json();
    issues.push(...batch.filter((issue) => !issue.pull_request));
    if (batch.length < 100) break;
  }
  return issues;
}

export async function run({ repo, token, slugs, fetchImpl = fetch }) {
  if (!repo || !token) return null;

  const { map, missing } = plan(await listIssues(fetchImpl, token, repo), slugs);
  if (missing.length > 0) await api(fetchImpl, token, 'POST', `/repos/${repo}/labels`, { name: LABEL });

  for (const slug of missing) {
    const response = await api(fetchImpl, token, 'POST', `/repos/${repo}/issues`, {
      title: issueTitle(slug),
      body: `Reactions for the post \`${slug}\`. Created by the blog's deploy workflow; each comment is one reaction.`,
      labels: [LABEL],
    });
    if (!response.ok) throw new Error(`creating the issue for ${slug} failed: ${response.status}`);
    map[slug] = (await response.json()).number;
  }
  return map;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const slugs = readdirSync('src/content/posts', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const map = await run({
    repo: process.env.REACTIONS_REPO,
    token: process.env.REACTIONS_TOKEN,
    slugs,
  });
  if (map) console.log(`PUBLIC_REACTION_ISSUES=${JSON.stringify(map)}`);
}
