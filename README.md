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

## WPM configuration

- Use the slider (saved to localStorage).
- Or pass a URL param: `http://localhost:5173/?wpm=420`.

## Shortcuts

- Space: play/pause
- Arrow keys: step
- F: fullscreen toggle
- Esc: reset
