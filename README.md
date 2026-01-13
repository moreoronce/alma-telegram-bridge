# Alma Telegram Bridge

🌉 一款将 Alma AI 助手与 Telegram 无缝连接的插件，让你随时随地掌控 AI 对话。

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| **双向同步** | Alma 的回复实时推送到 Telegram |
| **线程管理** | 在 Telegram 中浏览和切换 Alma 对话 |
| **消息查看** | 随时查看历史对话内容，支持分页浏览 |
| **按钮交互** | Inline Keyboard 操作，无需记忆命令 |
| **消息通知** | Telegram 消息以通知形式展示在 Alma |

## 📱 界面预览

### 主菜单
```
🤖 Alma Telegram Bridge

Select an option:

[📋 Threads]  [💬 Messages]
[📍 Current]  [🔄 Refresh]
```

### 线程列表
```
📋 Threads (12 total)

Tap to select:

[1. Telegram Bridge 开发 ✅]
[2. React 项目优化]
[3. API 设计讨论]

[⬅️ Prev]  [Next ➡️]
[🏠 Menu]
```

### 消息浏览
```
💬 Messages (25 total)
👤 User: 12 | 🤖 AI: 13

Tap to view:

[🤖 好的，让我帮你实现这个功能...]
[👤 请帮我写一个函数...]

[⬅️ Older]  [Newer ➡️]
[🏠 Menu]
```

## 🚀 快速开始

### 1. 获取 Telegram Bot Token

1. 在 Telegram 中搜索 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 创建新机器人
3. 按提示设置名称，获取 **Bot Token**

### 2. 获取你的 Chat ID

1. 在 Telegram 中搜索 [@userinfobot](https://t.me/userinfobot)
2. 发送任意消息，机器人会回复你的 **Chat ID**

### 3. 配置插件

在 Alma 设置中添加以下配置：

```json
{
  "telegram-bridge.botToken": "YOUR_BOT_TOKEN",
  "telegram-bridge.chatId": "YOUR_CHAT_ID"
}
```

### 4. 开始使用

1. 重启 Alma
2. 在 Telegram 中向你的 Bot 发送 `/start`
3. 点击按钮操作，享受便捷体验！

## ⚙️ 配置项

| 设置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `telegram-bridge.botToken` | string | - | Telegram Bot Token（必填） |
| `telegram-bridge.chatId` | string | - | 你的 Telegram Chat ID（必填） |
| `telegram-bridge.pollingInterval` | number | 2000 | 消息轮询间隔，单位毫秒 |
| `telegram-bridge.threadId` | string | - | 默认绑定的 Alma 线程 ID |

## 📖 命令列表

| 命令 | 说明 |
|------|------|
| `/start` | 启动机器人，显示主菜单 |
| `/menu` | 显示主菜单 |
| `/ping` | 测试连接延迟 |

> 💡 **提示**：推荐使用按钮操作，更加便捷！

## 🎯 适用场景

- **移动办公** - 手机上查看 Alma 的回复
- **远程监控** - 实时接收 AI 对话通知
- **多设备同步** - 电脑和手机无缝切换
- **碎片时间** - 通勤路上回顾对话内容

## 🔧 技术细节

- 使用 Telegram Bot API 长轮询模式
- 支持 Inline Keyboard 交互
- 自动解析 Alma 复杂消息格式（parts 数组）
- 消息内容智能截断，适配 Telegram 限制

## 📝 更新日志

### v1.0.0
- ✅ 基础双向通信
- ✅ 线程管理功能
- ✅ Inline Keyboard 按钮交互
- ✅ 消息分页浏览
- ✅ 自动命令菜单注册

## 📄 License

MIT License

---

**Made with ❤️ for Alma**
