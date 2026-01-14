"use strict";
/**
 * Telegram Bridge Plugin for Alma
 * With Inline Keyboard support for better UX
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const https_1 = __importDefault(require("https"));
// 解析消息内容，提取文本
function extractMessageText(content) {
    if (typeof content === 'string') {
        return content;
    }
    if (!content || typeof content !== 'object') {
        return '';
    }
    const obj = content;
    if (Array.isArray(obj.parts)) {
        const textParts = [];
        for (const part of obj.parts) {
            if (typeof part === 'string') {
                textParts.push(part);
            }
            else if (part && typeof part === 'object') {
                const p = part;
                if (p.type === 'text' && typeof p.text === 'string') {
                    textParts.push(p.text);
                }
                else if (p.type === 'step-start') {
                    // skip
                }
                else if (typeof p.type === 'string' && p.type.startsWith('tool-')) {
                    const toolName = p.type.replace('tool-', '');
                    textParts.push(`[🔧 ${toolName}]`);
                }
            }
        }
        return textParts.join('\n').trim();
    }
    if (typeof obj.text === 'string') {
        return obj.text;
    }
    return JSON.stringify(content).substring(0, 500);
}
// Convert Markdown to Telegram HTML format (more reliable than MarkdownV2)
// Standard MD: **bold** *italic* `code` → HTML: <b>bold</b> <i>italic</i> <code>code</code>
function convertToTelegramHtml(text) {
    let result = text;
    // 1. Escape HTML special chars first (must be done before adding HTML tags)
    result = result.replace(/&/g, '&amp;');
    result = result.replace(/</g, '&lt;');
    result = result.replace(/>/g, '&gt;');
    // 2. Convert code blocks: ```lang\ncode``` → <pre><code class="language-lang">code</code></pre>
    result = result.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
        if (lang) {
            return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
        }
        return `<pre><code>${code.trim()}</code></pre>`;
    });
    // 3. Convert inline code: `code` → <code>code</code>
    result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
    // 4. Convert bold: **text** → <b>text</b>
    result = result.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    // 5. Convert italic: *text* → <i>text</i>
    result = result.replace(/\*([^\s*][^*]*[^\s*])\*/g, '<i>$1</i>');
    result = result.replace(/\*([^\s*])\*/g, '<i>$1</i>');
    // 6. Convert links: [text](url) → <a href="url">text</a>
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    // 7. Convert strikethrough: ~~text~~ → <s>text</s>
    result = result.replace(/~~(.+?)~~/g, '<s>$1</s>');
    return result;
}
async function activate(context) {
    const { logger, settings, events, ui, chat } = context;
    logger.info('Telegram Bridge plugin activating...');
    const config = {
        telegramBotToken: settings.get('telegram-bridge.botToken') || '',
        telegramChatId: settings.get('telegram-bridge.chatId') || '',
        almaThreadId: settings.get('telegram-bridge.threadId') || '',
        pollingInterval: settings.get('telegram-bridge.pollingInterval') || 2000,
    };
    if (!config.telegramBotToken || !config.telegramChatId) {
        ui.showNotification('Telegram Bridge: Please configure Bot Token and Chat ID', { type: 'warning' });
    }
    let isPolling = false;
    let pollingTimer = null;
    let lastUpdateId = 0;
    let selectedThreadId = config.almaThreadId || null;
    let cachedThreads = [];
    let cachedMessages = [];
    let messagePageIndex = 0;
    function telegramApiRequest(method, params = {}) {
        return new Promise((resolve) => {
            const data = JSON.stringify(params);
            const options = {
                hostname: 'api.telegram.org',
                port: 443,
                path: '/bot' + config.telegramBotToken + '/' + method,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
                },
            };
            const req = https_1.default.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body));
                    }
                    catch {
                        resolve({ ok: false, description: 'Parse error' });
                    }
                });
            });
            req.on('error', (e) => resolve({ ok: false, description: e.message }));
            req.write(data);
            req.end();
        });
    }
    async function sendMessage(text, keyboard, useHtml = false) {
        if (!config.telegramBotToken || !config.telegramChatId) {
            logger.error('sendMessage failed: missing token or chatId');
            return false;
        }
        const params = {
            chat_id: config.telegramChatId,
            text: text,
        };
        if (useHtml) {
            params.parse_mode = 'HTML';
        }
        if (keyboard) {
            params.reply_markup = keyboard;
        }
        const response = await telegramApiRequest('sendMessage', params);
        if (!response.ok) {
            logger.error(`sendMessage failed: ${response.description || 'Unknown error'}`);
        }
        return response.ok;
    }
    async function editMessage(messageId, text, keyboard, useHtml = false) {
        const params = {
            chat_id: config.telegramChatId,
            message_id: messageId,
            text: text,
        };
        if (useHtml) {
            params.parse_mode = 'HTML';
        }
        if (keyboard) {
            params.reply_markup = keyboard;
        }
        const response = await telegramApiRequest('editMessageText', params);
        if (!response.ok) {
            logger.error(`editMessage failed: ${response.description || 'Unknown error'}`);
        }
        return response.ok;
    }
    // 删除旧消息并发送新消息（用于翻页）
    async function replaceMessage(messageId, text, keyboard) {
        // 直接发送新消息，不删除旧消息
        const result = await sendMessage(text, keyboard);
        if (result) {
            // 新消息发送成功后，尝试删除旧消息（忽略失败）
            await telegramApiRequest('deleteMessage', {
                chat_id: config.telegramChatId,
                message_id: messageId,
            });
        }
        return result;
    }
    async function answerCallback(callbackId, text) {
        await telegramApiRequest('answerCallbackQuery', {
            callback_query_id: callbackId,
            text: text,
        });
    }
    async function getUpdates() {
        const response = await telegramApiRequest('getUpdates', {
            offset: lastUpdateId + 1,
            timeout: 30,
            allowed_updates: ['message', 'callback_query'],
        });
        return response.ok && response.result ? response.result : [];
    }
    // 创建主菜单键盘
    function createMainMenu() {
        return {
            inline_keyboard: [
                [
                    { text: '📋 Threads', callback_data: 'threads:0' },
                    { text: '💬 Messages', callback_data: 'm:0' },
                ],
                [
                    { text: '📍 Current', callback_data: 'current' },
                    { text: '🔄 Refresh', callback_data: 'refresh' },
                ],
                [
                    { text: '🐛 Debug', callback_data: 'debug' },
                ],
            ]
        };
    }
    // 创建线程列表键盘
    function createThreadsKeyboard(page) {
        const pageSize = 5;
        const start = page * pageSize;
        const end = Math.min(start + pageSize, cachedThreads.length);
        const threads = cachedThreads.slice(start, end);
        const buttons = threads.map((t, i) => {
            const idx = start + i;
            const selected = t.id === selectedThreadId ? ' ✅' : '';
            const title = t.title.length > 25 ? t.title.substring(0, 22) + '...' : t.title;
            return [{ text: `${idx + 1}. ${title}${selected}`, callback_data: `select:${idx}` }];
        });
        // 分页按钮
        const navRow = [];
        if (page > 0) {
            navRow.push({ text: '⬅️ Prev', callback_data: `threads:${page - 1}` });
        }
        if (end < cachedThreads.length) {
            navRow.push({ text: 'Next ➡️', callback_data: `threads:${page + 1}` });
        }
        if (navRow.length > 0) {
            buttons.push(navRow);
        }
        // 返回按钮
        buttons.push([{ text: '🏠 Menu', callback_data: 'menu' }]);
        return { inline_keyboard: buttons };
    }
    // 创建消息列表键盘
    function createMessagesKeyboard(page) {
        const pageSize = 5;
        const total = cachedMessages.length;
        const totalPages = Math.ceil(total / pageSize);
        logger.info(`createMessagesKeyboard: page=${page}, total=${total}, totalPages=${totalPages}`);
        // 从最新消息开始显示 (page 0 = 最新)
        const start = Math.max(0, total - (page + 1) * pageSize);
        const end = Math.max(0, total - page * pageSize);
        logger.info(`createMessagesKeyboard: start=${start}, end=${end}`);
        const messages = cachedMessages.slice(start, end).reverse();
        const buttons = messages.map((m, i) => {
            const realIdx = end - 1 - i;
            const role = m.role === 'user' ? '👤' : m.role === 'assistant' ? '🤖' : '⚙️';
            const rawText = extractMessageText(m.content);
            // 清理预览文本 - 只保留字母数字和中文
            const preview = rawText
                .substring(0, 20)
                .replace(/\n/g, ' ')
                .replace(/[^\w\s\u4e00-\u9fff]/g, '')
                .trim()
                .substring(0, 18) + '...';
            return [{ text: `${role} ${preview}`, callback_data: `v:${realIdx}` }];
        });
        // 分页按钮
        const navRow = [];
        // 有更新的消息（放左边，左箭头）
        if (page > 0) {
            navRow.push({ text: `⬅ ${page}`, callback_data: `p:${page - 1}` });
        }
        // 有更早的消息（放右边，右箭头）
        if (start > 0) {
            navRow.push({ text: `${page + 2} ➡`, callback_data: `p:${page + 1}` });
        }
        if (navRow.length > 0) {
            buttons.push(navRow);
        }
        buttons.push([{ text: '🏠 Menu', callback_data: 'menu' }]);
        logger.info(`createMessagesKeyboard: created ${buttons.length} button rows`);
        return { inline_keyboard: buttons };
    }
    async function handleCallback(query) {
        const data = query.data || '';
        const messageId = query.message?.message_id;
        if (!messageId) {
            await answerCallback(query.id);
            return;
        }
        // 解析回调数据
        const [action, param] = data.split(':');
        if (action === 'menu') {
            await editMessage(messageId, '🤖 Alma Telegram Bridge\n\nSelect an option:', createMainMenu());
            await answerCallback(query.id);
        }
        else if (action === 'threads') {
            const page = parseInt(param) || 0;
            try {
                const threads = await chat.listThreads();
                cachedThreads = threads.slice(0, 50).map(t => ({
                    id: t.id,
                    title: t.title || 'Untitled'
                }));
                const total = cachedThreads.length;
                const text = `📋 Threads (${total} total)\n\nTap to select:`;
                await editMessage(messageId, text, createThreadsKeyboard(page));
                await answerCallback(query.id);
            }
            catch (e) {
                await answerCallback(query.id, 'Error loading threads');
            }
        }
        else if (action === 'select') {
            const idx = parseInt(param);
            if (idx >= 0 && idx < cachedThreads.length) {
                const thread = cachedThreads[idx];
                selectedThreadId = thread.id;
                try {
                    await context.storage.local.set('selectedThreadId', thread.id);
                }
                catch { }
                await editMessage(messageId, `✅ Thread selected:\n\n${thread.title}\n\nID: ${thread.id.substring(0, 12)}...`, {
                    inline_keyboard: [
                        [{ text: '💬 View Messages', callback_data: 'm:0' }],
                        [{ text: '🏠 Menu', callback_data: 'menu' }],
                    ]
                });
                await answerCallback(query.id, 'Selected!');
            }
        }
        else if (action === 'messages' || action === 'm' || action === 'p') {
            const page = parseInt(param) || 0;
            messagePageIndex = page;
            logger.info(`Messages page request: ${page}, cached: ${cachedMessages.length}`);
            const threadId = selectedThreadId || (await chat.getActiveThread())?.id;
            if (!threadId) {
                await editMessage(messageId, '❌ No thread selected.\n\nPlease select a thread first.', {
                    inline_keyboard: [[{ text: '📋 Select Thread', callback_data: 'threads:0' }]]
                });
                await answerCallback(query.id);
                return;
            }
            try {
                // 缓存为空时获取消息
                if (cachedMessages.length === 0) {
                    const messages = await chat.getMessages(threadId);
                    cachedMessages = messages;
                    logger.info(`Loaded ${messages.length} messages`);
                }
                const total = cachedMessages.length;
                const userCount = cachedMessages.filter(m => m.role === 'user').length;
                const aiCount = cachedMessages.filter(m => m.role === 'assistant').length;
                const totalPages = Math.ceil(total / 5);
                // 使用时间戳确保每次内容都不同
                const timestamp = Date.now() % 10000;
                const text = `💬 Messages (${total} total)\n👤 User: ${userCount} | 🤖 AI: ${aiCount}\n\n📄 Page ${page + 1}/${totalPages} [${timestamp}]`;
                const keyboard = createMessagesKeyboard(page);
                logger.info(`Page ${page}: buttons=${keyboard.inline_keyboard.length}`);
                // 先尝试 editMessage
                const success = await editMessage(messageId, text, keyboard);
                if (!success) {
                    logger.info('editMessage failed, sending new message');
                    await sendMessage(text, keyboard);
                }
                await answerCallback(query.id);
            }
            catch (e) {
                logger.error('Error loading messages: ' + e);
                // 发送错误信息到 Telegram
                await sendMessage(`❌ Error: ${String(e).substring(0, 200)}`);
                await answerCallback(query.id, 'Error');
            }
        }
        else if (action === 'msg' || action === 'v') {
            const idx = parseInt(param);
            if (idx >= 0 && idx < cachedMessages.length) {
                const m = cachedMessages[idx];
                const role = m.role === 'user' ? '👤 User' : m.role === 'assistant' ? '🤖 Assistant' : '⚙️ System';
                const content = extractMessageText(m.content);
                const time = new Date(m.createdAt).toLocaleString();
                let rawText = content;
                if (rawText.length > 3500) {
                    rawText = rawText.substring(0, 3500) + '\n\n... (truncated)';
                }
                // Convert content to HTML for formatting
                const formattedContent = convertToTelegramHtml(rawText);
                const text = `${role}\n📅 ${time}\n\n${formattedContent}`;
                await editMessage(messageId, text, {
                    inline_keyboard: [
                        [{ text: '⬅️ Back to Messages', callback_data: `m:${messagePageIndex}` }],
                        [{ text: '🏠 Menu', callback_data: 'menu' }],
                    ]
                }, true); // useHtml = true
                await answerCallback(query.id);
            }
        }
        else if (action === 'current') {
            let text = '';
            if (selectedThreadId) {
                const cached = cachedThreads.find(t => t.id === selectedThreadId);
                text = `📍 Current Thread:\n\n${cached?.title || 'Unknown'}\n\nID: ${selectedThreadId.substring(0, 12)}...`;
            }
            else {
                const active = await chat.getActiveThread();
                if (active) {
                    text = `📍 Using Active Thread:\n\n${active.title || 'Untitled'}\n\nID: ${active.id.substring(0, 12)}...`;
                }
                else {
                    text = '❌ No thread selected';
                }
            }
            await editMessage(messageId, text, {
                inline_keyboard: [
                    [{ text: '💬 View Messages', callback_data: 'm:0' }],
                    [{ text: '📋 Change Thread', callback_data: 'threads:0' }],
                    [{ text: '🏠 Menu', callback_data: 'menu' }],
                ]
            });
            await answerCallback(query.id);
        }
        else if (action === 'refresh') {
            cachedThreads = [];
            cachedMessages = [];
            selectedThreadId = null;
            await editMessage(messageId, '🔄 Cache cleared!\n\nSelect an option:', createMainMenu());
            await answerCallback(query.id, 'Refreshed!');
        }
        else if (action === 'debug') {
            const debugInfo = [
                '🐛 Debug Info',
                '',
                `Selected Thread: ${selectedThreadId ? selectedThreadId.substring(0, 12) + '...' : 'None'}`,
                `Cached Threads: ${cachedThreads.length}`,
                `Cached Messages: ${cachedMessages.length}`,
                `Message Page Index: ${messagePageIndex}`,
                `Bot Token: ${config.telegramBotToken ? '✅ Set' : '❌ Not set'}`,
                `Chat ID: ${config.telegramChatId || 'Not set'}`,
            ];
            await editMessage(messageId, debugInfo.join('\n'), {
                inline_keyboard: [
                    [{ text: '🔄 Refresh Cache', callback_data: 'refresh' }],
                    [{ text: '🏠 Menu', callback_data: 'menu' }],
                ]
            });
            await answerCallback(query.id);
        }
        else {
            await answerCallback(query.id);
        }
    }
    async function handleMessage(update) {
        if (!update.message?.text)
            return;
        const text = update.message.text;
        const chatId = update.message.chat.id.toString();
        if (chatId !== config.telegramChatId)
            return;
        logger.info('Received: ' + text.substring(0, 50));
        if (text.startsWith('/')) {
            const command = text.split(' ')[0].toLowerCase();
            if (command === '/start' || command === '/menu') {
                await sendMessage('🤖 Alma Telegram Bridge\n\nSelect an option:', createMainMenu());
            }
            else if (command === '/ping') {
                const latency = Date.now() - update.message.date * 1000;
                await sendMessage(`🏓 Pong! Latency: ${latency}ms`, {
                    inline_keyboard: [[{ text: '🏠 Menu', callback_data: 'menu' }]]
                });
            }
            else {
                await sendMessage('Use the buttons below to navigate:', createMainMenu());
            }
            return;
        }
        // 普通消息 - 显示通知
        ui.showNotification('Telegram: ' + text.substring(0, 100), { type: 'info', duration: 10000 });
    }
    async function processUpdate(update) {
        if (update.callback_query) {
            await handleCallback(update.callback_query);
        }
        else if (update.message) {
            await handleMessage(update);
        }
    }
    async function startPolling() {
        if (isPolling || !config.telegramBotToken)
            return;
        isPolling = true;
        await telegramApiRequest('deleteWebhook', { drop_pending_updates: false });
        // 设置命令菜单
        await telegramApiRequest('setMyCommands', {
            commands: [
                { command: 'start', description: '🚀 Start / Show menu' },
                { command: 'menu', description: '📱 Show main menu' },
                { command: 'ping', description: '🏓 Test connection' },
            ]
        });
        try {
            const savedThreadId = await context.storage.local.get('selectedThreadId');
            if (savedThreadId) {
                selectedThreadId = savedThreadId;
                logger.info('Loaded saved thread: ' + savedThreadId);
            }
        }
        catch { }
        pollLoop();
    }
    async function pollLoop() {
        if (!isPolling)
            return;
        try {
            const updates = await getUpdates();
            for (const update of updates) {
                lastUpdateId = Math.max(lastUpdateId, update.update_id);
                await processUpdate(update);
            }
        }
        catch (error) {
            logger.error('Polling error: ' + error);
        }
        if (isPolling) {
            pollingTimer = setTimeout(pollLoop, config.pollingInterval);
        }
    }
    function stopPolling() {
        isPolling = false;
        if (pollingTimer) {
            clearTimeout(pollingTimer);
            pollingTimer = null;
        }
    }
    const unsubscribeDidReceive = events.on('chat.message.didReceive', async (input) => {
        const threadId = input.threadId;
        if (selectedThreadId && threadId !== selectedThreadId)
            return;
        const responseText = input.response?.content;
        if (!responseText)
            return;
        let textToSend = responseText;
        if (textToSend.length > 4000) {
            textToSend = textToSend.substring(0, 4000) + '\n\n... (truncated)';
        }
        // Convert to Telegram HTML and send with formatting
        const formattedText = convertToTelegramHtml(textToSend);
        await sendMessage(formattedText, undefined, true);
    });
    setTimeout(() => {
        startPolling();
        ui.showNotification('Telegram Bridge active', { type: 'success' });
    }, 1000);
    return {
        dispose: () => {
            stopPolling();
            unsubscribeDidReceive.dispose();
        },
    };
}
