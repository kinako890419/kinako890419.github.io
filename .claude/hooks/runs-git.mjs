// PreToolUse guard: `node runs-git.mjs commit` exits 0 when the Bash command runs `git commit`, 1 otherwise.
// Backs up the settings `if` filter, which does not always hold.
const sub = process.argv[2];
let input = '';
for await (const chunk of process.stdin) input += chunk;
const command = JSON.parse(input || '{}').tool_input?.command ?? '';
const runsSub = new RegExp(String.raw`(?:^|[;&|(\s])git(?:\s+-[cC]\s+\S+|\s+--?[\w-]+(?:=\S+)?)*\s+${sub}\b`);
process.exit(runsSub.test(command) ? 0 : 1);
