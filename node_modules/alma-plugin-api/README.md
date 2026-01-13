# alma-plugin-api

TypeScript type definitions for developing [Alma](https://github.com/yetone/alma) plugins.

## Installation

```bash
npm install -D alma-plugin-api
```

## Usage

```typescript
import type { PluginContext, PluginActivation } from 'alma-plugin-api';

export async function activate(context: PluginContext): Promise<PluginActivation> {
    const { logger, tools, commands, ui, settings } = context;

    logger.info('Plugin activated!');

    // Register a tool
    const toolDisposable = tools.register('my-plugin.hello', {
        name: 'Hello',
        description: 'Say hello',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Name to greet' }
            },
            required: ['name']
        },
        execute: async (args) => {
            const { name } = args as { name: string };
            return { message: `Hello, ${name}!` };
        }
    });

    // Register a command
    const commandDisposable = commands.register('my-plugin.greet', async () => {
        ui.showNotification('Hello from my plugin!', { type: 'info' });
    });

    return {
        dispose: () => {
            logger.info('Plugin deactivated');
            toolDisposable.dispose();
            commandDisposable.dispose();
        }
    };
}
```

## Available APIs

### Core APIs

| API | Description |
|-----|-------------|
| `logger` | Logging utilities (info, warn, error, debug) |
| `tools` | Register AI-usable tools |
| `commands` | Register command palette commands |
| `hooks` | Subscribe to lifecycle events |
| `ui` | UI utilities (notifications, status bar) |
| `settings` | Read/write plugin settings |
| `chat` | Access chat threads and messages |
| `transform` | Transform prompts and messages |
| `themes` | Register and manage themes |
| `storage` | Persistent key-value storage |
| `secrets` | Secure storage for sensitive data |

### Plugin Info

| Property | Description |
|----------|-------------|
| `pluginId` | Unique identifier of the plugin |
| `pluginPath` | Filesystem path to the plugin |
| `globalState` | Persistent state across sessions |
| `workspaceState` | Workspace-scoped state |

## License

MIT
