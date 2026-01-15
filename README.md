# RSVP Reader

Rapid serial visual presentation reader with URL summarization.

## Run

```bash
just start
```

Stop it:

```bash
just stop
```

### Install just

```bash
brew install just
```

## On login (macOS)

```bash
just install-login
```

Remove:

```bash
just uninstall-login
```

## Summarize integration

Install the CLI and set a model key (example shown for OpenAI):

```bash
npm i -g @steipete/summarize
export OPENAI_API_KEY=your_key
```

Then paste a URL and click **Summarize URL**.

### Summarize mode

By default, the local `index.html` uses the CLI endpoint. You can override the mode by changing
the `data-summarize` attribute on the `<body>` tag:

- `cli` → `/summarize` (local CLI via `server.js`)
- `api` → `/api/summarize` (Vercel serverless)

### Vercel

The deployed app uses a serverless function at `/api/summarize` (with a `/summarize` rewrite).
Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) in Vercel env vars.

## WPM configuration

- Use the slider (defaults to 300 on load).
- Or pass a URL param: `http://localhost:5173/?wpm=420`.

## Shortcuts

- Space: play/pause
- Arrow keys: step
- F: fullscreen toggle
- Esc: reset
