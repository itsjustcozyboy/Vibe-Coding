# Vibe-Coding
Let’s make vibe coder

## Claude Code setup in GitHub Codespaces

Run the following commands in your Codespaces terminal:

```bash
chmod +x scripts/setup-claude-code.sh
./scripts/setup-claude-code.sh
```

For gateway mode, the easiest run command is:

```bash
./scripts/claude-gateway.sh
```

### API key

Yes, an API key is required if you authenticate with API access.

Set it for the current terminal session:

```bash
export ANTHROPIC_API_KEY="YOUR_API_KEY"
```

### Custom gateway (Base URL + Auth Token)

If you use a gateway endpoint, set these env vars instead:

```bash
export ANTHROPIC_BASE_URL="https://claude.1000.school"
export ANTHROPIC_AUTH_TOKEN="YOUR_AUTH_TOKEN"
```

Or store them in `.env` (recommended for local use only):

```bash
cp .env.example .env
# edit .env and set your real token
./scripts/claude-gateway.sh
```

Persist it across new terminal sessions:

```bash
echo 'export ANTHROPIC_API_KEY="YOUR_API_KEY"' >> ~/.bashrc
source ~/.bashrc
```

For gateway mode, persist these instead:

```bash
echo 'export ANTHROPIC_BASE_URL="https://claude.1000.school"' >> ~/.bashrc
echo 'export ANTHROPIC_AUTH_TOKEN="YOUR_AUTH_TOKEN"' >> ~/.bashrc
source ~/.bashrc
```

Start Claude Code:

```bash
./scripts/claude-gateway.sh
```

### Verify installation

```bash
claude --version
```

If `claude` is not found, close and reopen the terminal once and retry.

### Security note

Do not commit real tokens in tracked files. Use local shell env vars or a local-only `.env` file excluded by `.gitignore`.

## Push all changes quickly

You can push from repo root with:

```bash
chmod +x publish-all.sh scripts/publish-all.sh
SKIP_HOOKS=1 ./publish-all.sh "feat: update workspace" main
```

If you want hooks enabled, run with `SKIP_HOOKS=0`.

## Vercel deployment (web)

This repository has a Next.js frontend in `web/`.

### Required environment variables (Vercel Project Settings)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (required by `/api/register-claude`)
- `ANTHROPIC_API_KEY` (optional, enables Claude planner in `/api/terminal-execute`)

### Deploy via CLI

```bash
npm i -g vercel
cd web
vercel
vercel --prod
```

After deploy, Vercel will print the production URL.

## Single Terminal architecture (Claude + Supabase realtime)

- Web terminal page: `web/pages/terminal.js`
- Execution API: `web/pages/api/terminal-execute.js`

How it works:

1. User types one command in the web terminal.
2. API converts command to safe actions.
	- If `ANTHROPIC_API_KEY` exists, Claude plans the action JSON.
	- If key is missing, rule-based parser is used.
3. API executes only allowed Supabase actions (`list/create/update/delete` for `todos`, list for `claude_actions`).
4. Frontend subscribes to Supabase Realtime on `todos`, so DB changes appear instantly.

This keeps one terminal-like UX in the web app while staying deployable on Vercel serverless.

### Troubleshooting 401 invalid or revoked token

If gateway mode returns 401:

1. Reissue a new gateway token and update `.env` or shell env vars.
2. Ensure token has no hidden spaces/newlines.
3. Ensure `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN` are from the same gateway/project.
4. Retry with:

```bash
./scripts/claude-gateway.sh
```
