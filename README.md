<div align="center">
  <img src="./logo.jpg" alt="Alma Telegram Bridge Logo" width="120" />
  
  # Alma Telegram Bridge

  **随时随地，掌控你的 AI 对话**
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Telegram](https://img.shields.io/badge/Telegram-Bot-blue?logo=telegram)](https://telegram.org)
  
  <p>
    一款将 Alma 与 Telegram 无缝连接的插件。<br/>
    无论身在何处，都能通过 Telegram 实时接收回复、查看对话线程。
  </p>
</div>

---

## ✨ 核心特性

| 功能 | 说明 |
| :--- | :--- |
| **🔄 双向同步** | Alma 的回复实时推送到 Telegram，手机端即时响应 |
| **📑 线程管理** | 在 Telegram 中轻松浏览、切换和管理 Alma 对话列表 |
| **📜 历史回溯** | 支持分页查看历史消息，上下文一目了然 |
| **🎮 便捷交互** | 全面支持 Inline Keyboard 按钮，告别繁琐的命令输入 |
| **🔔 实时通知** | 即使不在电脑前，也能通过通知第一时间获取 AI 响应 |

## 📱 界面预览

<details>
<summary><b>点击展开界面演示</b></summary>

### 主菜单
```text
🤖 Alma Telegram Bridge

Select an option:

[📋 Threads]  [💬 Messages]
[📍 Current]  [🔄 Refresh]
```

### 线程列表
```text
📋 Threads (12 total)

Tap to select:

[1. Telegram Bridge 开发 ✅]
[2. React 项目优化]
[3. API 设计讨论]

[⬅️ Prev]  [Next ➡️]
[🏠 Menu]
```

### 消息浏览
```text
💬 Messages (25 total)
👤 User: 12 | 🤖 AI: 13

Tap to view:

[🤖 好的，让我帮你实现这个功能...]
[👤 请帮我写一个函数...]

[⬅️ Older]  [Newer ➡️]
[🏠 Menu]
```
</details>

## 🚀 快速开始

只需简单几步，即可开启你的移动 AI 之旅。

### 1. 获取 Telegram Bot Token
1. 在 Telegram 中搜索并联系 [@BotFather](https://t.me/BotFather)。
2. 发送 `/newbot` 创建一个新的机器人。
3. 按照提示设置名称，最终你将获得一个 **Bot Token**。

### 2. 获取你的 Chat ID
1. 在 Telegram 中搜索 [@userinfobot](https://t.me/userinfobot)。
2. 发送任意消息，机器人会立即回复你的 **Chat ID**。

### 3. 配置插件
在 Alma 的设置文件中添加以下配置：

```json
{
  "telegram-bridge.botToken": "YOUR_BOT_TOKEN",
  "telegram-bridge.chatId": "YOUR_CHAT_ID"
}
```

### 4. 启动体验
1. 重启 Alma 以加载配置。
2. 在 Telegram 中向你的 Bot 发送 `/start`。
3. 如果看到欢迎菜单，说明连接成功！🎉

## ⚙️ 配置详解

| 设置项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `telegram-bridge.botToken` | `string` | - | **必填**，你的 Telegram Bot Token |
| `telegram-bridge.chatId` | `string` | - | **必填**，你的个人 Chat ID |
| `telegram-bridge.pollingInterval` | `number` | `2000` | 消息轮询间隔（毫秒），越小越即时 |
| `telegram-bridge.threadId` | `string` | - | 指定默认绑定的 Alma 线程 ID（可选） |

## 📖 常用命令

虽然我们推荐使用**按钮交互**，但也支持以下命令：

| 命令 | 作用 |
| :--- | :--- |
| `/start` | 启动机器人并显示主菜单 |
| `/menu` | 重新呼出主菜单 |
| `/ping` | 测试与服务器的连接延迟 |

## 🎯 适用场景

- 🚌 **通勤路上**：利用碎片时间回顾或继续对话。
- 🛌 **离开电脑**：躺在沙发上也能轻松控制 Alma。
- 🔔 **任务监控**：让 Alma 在后台运行任务，完成后通过 Telegram 通知你。

## 🔧 技术细节

- 基于 **Telegram Bot API** (Long Polling) 实现，无需公网 IP。
- 智能解析 Alma 复杂消息结构（支持 Parts 数组）。
- 自动处理长消息截断，完美适配 Telegram 消息长度限制。

---

<div align="center">
  
  **Made with ❤️ for Alma**
  
  [Report Bug](https://github.com/yourusername/alma-telegram-bridge/issues) · [Request Feature](https://github.com/yourusername/alma-telegram-bridge/issues)
</div>
