// PostToolUse hook: after a `git push`, report the GitHub Actions run for the pushed commit
// (link and current status; it does not wait for the result).
import { execFileSync } from 'node:child_process';
import path from 'node:path';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const { tool_input: toolInput = {}, cwd = process.cwd() } = JSON.parse(input || '{}');
const command = toolInput.command ?? '';

// Only act on a real `git push` (the settings `if` filter does not always hold).
if (!/(?:^|[;&|(\s])git(?:\s+-[cC]\s+\S+|\s+--?[\w-]+(?:=\S+)?)*\s+push\b/.test(command)) process.exit(0);
if (/(?:^|\s)(?:--dry-run|-n)(?:\s|$)/.test(command.split(/git\s+push/)[1] ?? '')) process.exit(0);

const target =
  command.match(/git\s+-C\s+("?)([^"\s]+)\1/)?.[2] ??
  command.match(/(?:^|&&|;)\s*cd\s+("?)([^"&;]+?)\1\s*(?:&&|;)/)?.[2];
const dir = target ? path.resolve(cwd, target.trim()) : cwd;

const run = (cmd, args) => {
  try {
    return execFileSync(cmd, args, {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10_000,
    }).trim();
  } catch {
    return '';
  }
};

const sha = run('git', ['rev-parse', 'HEAD']);
if (!sha) process.exit(0);
const short = sha.slice(0, 7);

// A run takes a few seconds to show up after the push.
let runs = [];
for (let attempt = 0; attempt < 6 && !runs.length; attempt++) {
  if (attempt) await new Promise((resolve) => setTimeout(resolve, 3000));
  const out = run('gh', ['run', 'list', '--commit', sha, '--json', 'workflowName,status,conclusion,url,event']);
  if (!out && attempt === 0 && !run('gh', ['auth', 'status'])) break;
  try {
    runs = JSON.parse(out || '[]');
  } catch {
    runs = [];
  }
}

const lines = runs.length
  ? [
      `GitHub Actions for ${short}:`,
      ...runs.map((r) => `- ${r.workflowName} (${r.event}): ${r.conclusion || r.status} ${r.url}`),
      `Not waiting for the result; check later with: gh run list --commit ${short}`,
    ]
  : [
      `No GitHub Actions run found for ${short} after ~15s.`,
      'deploy.yml skips pushes that only touch .claude/** or AGENTS.md; otherwise it may still be queuing.',
      `Check later with: gh run list --commit ${short}`,
    ];
const message = lines.join('\n');

process.stdout.write(
  JSON.stringify({
    systemMessage: message,
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: message },
  }),
);
