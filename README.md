# sidebar-usage

A TUI sidebar plugin for [opencode](https://opencode.ai) that shows per-turn and session-cumulative token usage, cache hit rate, and cost.

## Features

- **Last turn** breakdown: input, output, reasoning, cache read, cache write, cache hit %, context window usage
- **Session total** breakdown: same metrics aggregated across all assistant messages in the session
- **Cost** displayed when the session reports a non-zero cost
- Collapsible section (click the header to toggle)
- Reactive: updates automatically as new assistant messages arrive

## Compatibility

Tested with:

| opencode version | `@opentui/solid` | status |
|---|---|---|
| 1.17.9 | 0.2.16 | works |

The plugin uses `api.state.session.get?.()` with optional chaining, so it gracefully handles plugin API versions that do not expose the `get` method (older versions will simply hide the cost row).

## Installation

### From a local tarball

```sh
# In your opencode config directory (e.g. ~/.config/opencode on Linux/macOS
# or %USERPROFILE%\.config\opencode on Windows)
npm install --save /path/to/sidebar-usage-0.1.0.tgz
```

### From source (development)

```sh
git clone <repo-url> sidebar-usage
cd sidebar-usage
npm install
npm run build
```

Then in your opencode config directory:

```sh
npm install --save /path/to/sidebar-usage
```

## Configuration

Add the package name to the `plugin` array in your TUI config.

`~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["sidebar-usage"]
}
```

No `bunfig.toml` preload is required — the plugin ships pre-compiled.

Restart opencode. In any session with at least one assistant message, a `▼ Usage` block will appear in the sidebar showing:

```
▼ Usage
  Last turn
    input       1,234
    output        567
    reasoning     120
    cache r       800
    cache w        40
    cache hit   39%
    context   2,761 (12%)
  Session total
    input      12,340
    output      2,100
    reasoning     900
    cache r     5,000
    cache w       200
    cache hit   29%
    cost       $0.0123
```

Click the header to collapse.

## Building from source

Requires [Bun](https://bun.sh) 1.3+.

```sh
npm install
npm run build
```

Output goes to `dist/`. To produce a tarball:

```sh
npm pack
```

## License

MIT
