// PreToolUse hook: `node confirm-git.mjs commit|push` asks the user first, showing what the command will do.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const mode = process.argv[2];
let input = '';
for await (const chunk of process.stdin) input += chunk;
const { tool_input: toolInput = {}, cwd = process.cwd() } = JSON.parse(input || '{}');
const command = toolInput.command ?? '';

// Only act on a real `git commit` / `git push` (the settings `if` filter does not always hold), else allow silently.
const runsMode = new RegExp(String.raw`(?:^|[;&|(\s])git(?:\s+-[cC]\s+\S+|\s+--?[\w-]+(?:=\S+)?)*\s+${mode}\b`);
if (!runsMode.test(command)) process.exit(0);

const target =
  command.match(/git\s+-C\s+("?)([^"\s]+)\1/)?.[2] ??
  command.match(/(?:^|&&|;)\s*cd\s+("?)([^"&;]+?)\1\s*(?:&&|;)/)?.[2];
const dir = target ? path.resolve(cwd, target.trim()) : cwd;

const git = (...args) => {
  try {
    return execFileSync('git', ['-C', dir, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trimEnd();
  } catch {
    return '';
  }
};
const list = (out) => out.split('\n').filter(Boolean);
const cap = (lines, n) => (lines.length > n ? [...lines.slice(0, n), `... and ${lines.length - n} more`] : lines);
const indent = (lines) => lines.map((l) => `  ${l.replace('\t', ' ')}`);

const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
const repo = path.basename(git('rev-parse', '--show-toplevel') || dir);
const lines = [];

function commitMessage() {
  const heredoc = command.match(/<<-?\s*(['"]?)(\w+)\1\n([\s\S]*?)\n\s*\2(?:\n|$)/);
  if (/-F\s+-/.test(command) && heredoc) return heredoc[3];
  const file = command.match(/(?:-F|--file)\s+("?)([^"\s]+)\1/)?.[2];
  if (file && file !== '-') {
    try {
      return readFileSync(path.resolve(dir, file), 'utf8');
    } catch {
      return `(message file ${file} not found)`;
    }
  }
  const parts = [...command.matchAll(/(?:-m|--message)(?:\s+|=)(?:"((?:[^"\\]|\\.)*)"|'([^']*)')/g)];
  if (parts.length) return parts.map((m) => (m[1] ?? m[2]).replace(/\\(["\\$`])/g, '$1')).join('\n\n');
  if (/--amend/.test(command) && /--no-edit/.test(command)) return `(unchanged) ${git('log', '-1', '--format=%B')}`;
  return '(no message in the command; an editor will open)';
}

if (!branch) {
  lines.push(`${dir} is not a git repository.`);
} else if (mode === 'commit') {
  lines.push(`${/--amend/.test(command) ? 'Amend last commit' : 'Commit'} on ${branch} in ${repo}`);
  lines.push('Message:', ...indent(commitMessage().trim().split('\n')));
  const staged = list(git('diff', '--cached', '--name-status'));
  const stat = git('diff', '--cached', '--shortstat').trim();
  lines.push(staged.length ? `Staged (${stat}):` : 'Nothing staged yet.', ...indent(cap(staged, 15)));
  if (
    /git\s+add\b/.test(command) ||
    /\s-(?:[a-zA-Z]*a[a-zA-Z]*)\b|--all\b/.test(command.split(/git\s+commit/)[1] ?? '')
  ) {
    const pending = list(git('status', '--short')).filter((l) => l[1] !== ' ' || l.startsWith('??'));
    if (pending.length)
      lines.push('Not staged yet, but this command stages some or all of:', ...indent(cap(pending, 15)));
  }
} else {
  const upstream = git('rev-parse', '--abbrev-ref', '@{u}');
  const commits = list(git('log', '--format=%h %s', upstream ? `${upstream}..HEAD` : 'HEAD'));
  lines.push(`Push ${branch} => ${git('remote', 'get-url', 'origin') || 'no origin remote'}`);
  if (!commits.length) lines.push('Nothing new to push.');
  else {
    lines.push(upstream ? `${commits.length} commit(s) ahead of ${upstream}:` : 'New branch, all commits:');
    lines.push(...indent(cap(commits, 10)));
    const files = upstream ? list(git('diff', '--name-status', upstream, 'HEAD')) : [];
    const stat = git('diff', '--shortstat', upstream, 'HEAD').trim();
    if (files.length) lines.push(`Files (${stat}):`, ...indent(cap(files, 15)));
  }
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: lines.join('\n'),
    },
  }),
);
