// 专门针对Outlook优化的content.js
console.log('Outlook-optimized Content Script Loaded');

class EmailAssistant {
    constructor() {
        this.apiKey = '';
        this.init();
    }
    
    async init() {
        console.log('EmailAssistant initializing for Outlook...');
        
        // 获取API Key
        const result = await chrome.storage.sync.get(['openai_api_key']);
        this.apiKey = result.openai_api_key || '';
        console.log('API Key loaded:', this.apiKey ? 'Yes' : 'No');
        
        // 检测平台
        this.platform = this.detectPlatform();
        console.log('Detected platform:', this.platform);
        
        // 等待页面加载完成后添加AI按钮
        setTimeout(() => {
            this.addAIButton();
        }, 3000);
        
        // 监听来自popup的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Message received:', request);
            this.handleCommand(request);
            sendResponse({success: true});
        });
    }
    
    detectPlatform() {
        const url = window.location.href;
        if (url.includes('outlook.office.com') || url.includes('outlook.live.com')) {
            return 'outlook';
        } else if (url.includes('mail.google.com')) {
            return 'gmail';
        }
        return 'unknown';
    }
    
    addAIButton() {
        console.log('Adding AI button for', this.platform);
        
        let selectors = [];
        
        if (this.platform === 'outlook') {
            selectors = [
                // Outlook Web 编辑器选择器
                '[contenteditable="true"][aria-label*="Message body"]',
                '[contenteditable="true"][role="textbox"]',
                '.ms-rte-editor[contenteditable="true"]',
                'div[contenteditable="true"][data-testid="rooster-editor"]',
                '.allowTextSelection[contenteditable="true"]',
                '[contenteditable="true"]'
            ];
        } else if (this.platform === 'gmail') {
            selectors = [
                '[contenteditable="true"][aria-label*="邮件正文"]',
                '[contenteditable="true"][aria-label*="Message Body"]',
                'div[contenteditable="true"][role="textbox"]',
                '.Am.Al.editable'
            ];
        } else {
            selectors = ['[contenteditable="true"]'];
        }
        
        let composeArea = null;
        
        for (let selector of selectors) {
            const elements = document.querySelectorAll(selector);
            console.log(`Trying selector "${selector}": found ${elements.length} elements`);
            
            for (let element of elements) {
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                
                console.log('Element check:', {
                    selector,
                    width: rect.width,
                    height: rect.height,
                    display: style.display,
                    visibility: style.visibility,
                    element: element
                });
                
                if (rect.width > 200 && rect.height > 100 && 
                    style.display !== 'none' && 
                    style.visibility !== 'hidden') {
                    composeArea = element;
                    console.log('Selected compose area:', selector, element);
                    break;
                }
            }
            if (composeArea) break;
        }
        
        if (composeArea && !document.getElementById('ai-assistant-btn')) {
            const aiButton = document.createElement('button');
            aiButton.id = 'ai-assistant-btn';
            aiButton.innerHTML = '🤖 AI助手';
            aiButton.style.cssText = `
                background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                margin: 8px;
                box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
                transition: all 0.2s ease;
                z-index: 99999;
                position: relative;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            `;
            
            // 添加悬停效果
            aiButton.addEventListener('mouseenter', () => {
                aiButton.style.transform = 'translateY(-2px)';
                aiButton.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.4)';
            });
            
            aiButton.addEventListener('mouseleave', () => {
                aiButton.style.transform = 'translateY(0)';
                aiButton.style.boxShadow = '0 2px 8px rgba(79, 70, 229, 0.3)';
            });
            
            aiButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('AI button clicked');
                this.showAIMenu(e.target);
            });
            
            // 尝试多种方式添加按钮
            try {
                // 找到工具栏或编辑器附近的位置
                const toolbar = document.querySelector('[role="toolbar"]') || 
                               document.querySelector('.ms-rte-toolbar') ||
                               composeArea.parentNode;
                
                if (toolbar && toolbar !== composeArea) {
                    toolbar.appendChild(aiButton);
                } else {
                    composeArea.parentNode.insertBefore(aiButton, composeArea);
                }
                console.log('AI button added successfully');
            } catch (error) {
                console.error('Error adding button:', error);
                // 备用方案：添加到页面右上角
                document.body.appendChild(aiButton);
                aiButton.style.position = 'fixed';
                aiButton.style.top = '100px';
                aiButton.style.right = '20px';
            }
        } else if (!composeArea) {
            console.log('No suitable compose area found, will retry...');
            // 列出所有contenteditable元素用于调试
            const allEditables = document.querySelectorAll('[contenteditable="true"]');
            console.log('All contenteditable elements:', Array.from(allEditables).map(el => ({
                element: el,
                rect: el.getBoundingClientRect(),
                ariaLabel: el.getAttribute('aria-label'),
                className: el.className,
                tagName: el.tagName
            })));
            
            // 5秒后重试
            setTimeout(() => {
                this.addAIButton();
            }, 5000);
        }
    }
    
    showAIMenu(button) {
        console.log('Showing AI menu');
        
        // 移除已存在的菜单
        const existingMenu = document.getElementById('ai-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        // 创建快速菜单
        const menu = document.createElement('div');
        menu.id = 'ai-menu';
        menu.style.cssText = `
            position: fixed;
            background: white;
            border: 1px solid #e1e5e9;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.12);
            z-index: 100000;
            min-width: 180px;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;
        
        const menuItems = [
            {action: 'reply', text: '📝 智能回复', desc: '基于邮件生成回复'},
            {action: 'improve', text: '✨ 改进文本', desc: '优化选中或编辑器文本'},
            {action: 'translate', text: '🌐 翻译', desc: '中英文互译'},
            {action: 'summarize', text: '📋 总结', desc: '提取要点'},
            {action: 'formal', text: '👔 正式化', desc: '改为正式语气'},
            {action: 'friendly', text: '😊 友好化', desc: '改为友好语气'},
            {action: 'test', text: '🧪 测试', desc: '测试功能'}
        ];
        
        menuItems.forEach((item, index) => {
            const menuItem = document.createElement('div');
            menuItem.innerHTML = `
                <div style="font-weight: 500; color: #1f2937;">${item.text}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${item.desc}</div>
            `;
            menuItem.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                transition: background-color 0.2s;
                border-bottom: ${index < menuItems.length - 1 ? '1px solid #f3f4f6' : 'none'};
            `;
            
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.backgroundColor = '#f8fafc';
            });
            
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.backgroundColor = '';
            });
            
            menuItem.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Menu item clicked:', item.action);
                if (item.action === 'test') {
                    this.testAllFunctions();
                } else {
                    this.handleCommand({action: item.action});
                }
                menu.remove();
            });
            
            menu.appendChild(menuItem);
        });
        
        document.body.appendChild(menu);
        
        // 定位菜单
        const rect = button.getBoundingClientRect();
        const menuHeight = 400; // 预估菜单高度
        
        // 确保菜单不超出屏幕
        let top = rect.bottom + 5;
        if (top + menuHeight > window.innerHeight) {
            top = rect.top - menuHeight - 5;
        }
        
        let left = rect.left;
        if (left + 180 > window.innerWidth) {
            left = rect.right - 180;
        }
        
        menu.style.top = Math.max(5, top) + 'px';
        menu.style.left = Math.max(5, left) + 'px';
        
        // 点击其他地方关闭菜单
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target !== button) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
    }
    
    // 新增：测试所有功能
    testAllFunctions() {
        console.log('Testing all functions...');
        
        const composeArea = this.findComposeArea();
        const selectedText = this.getSelectedText();
        const emailContent = this.getEmailContent();
        
        let testResult = `🧪 功能测试结果 (${new Date().toLocaleString()})\n\n`;
        testResult += `✅ 编辑器检测: ${composeArea ? '找到编辑器' : '未找到编辑器'}\n`;
        testResult += `✅ 选中文本: "${selectedText}" (${selectedText.length}字符)\n`;
        testResult += `✅ 邮件内容: "${emailContent.substring(0, 50)}..." (${emailContent.length}字符)\n`;
        testResult += `✅ API Key: ${this.apiKey ? '已设置' : '未设置'}\n`;
        testResult += `✅ 平台: ${this.platform}\n\n`;
        testResult += `如果看到这段文字，说明基本功能正常！`;
        
        this.insertResponse(testResult, false);
        this.showNotification('功能测试完成，结果已插入编辑器', 'success');
    }
    
    async handleCommand(request) {
        console.log('Handling command:', request.action);
        
        if (!this.apiKey) {
            this.showNotification('请先在扩展弹窗中设置OpenAI API Key', 'error');
            return;
        }
        
        // 获取内容时显示更详细的信息
        const selectedText = this.getSelectedText();
        const emailContent = this.getEmailContent();
        
        console.log('=== Content Analysis ===');
        console.log('Selected text:', `"${selectedText}" (${selectedText.length} chars)`);
        console.log('Email content:', `"${emailContent.substring(0, 100)}..." (${emailContent.length} chars)`);
        
        // 决定使用哪个文本
        let targetText = '';
        if (selectedText.trim()) {
            targetText = selectedText.trim();
            console.log('Using selected text');
        } else if (emailContent.trim()) {
            targetText = emailContent.trim();
            console.log('Using email content');
        } else {
            // 如果都没有内容，尝试获取整个页面的文本内容
            const pageText = this.getPageText();
            if (pageText.trim()) {
                targetText = pageText.trim();
                console.log('Using page text');
            } else {
                targetText = '请先在编辑器中输入一些文本，或选中需要处理的文本';
                console.log('No content found, using default message');
            }
        }
        
        console.log('Final target text:', `"${targetText.substring(0, 200)}..." (${targetText.length} chars)`);
        
        let prompt = '';
        
        switch (request.action) {
            case 'reply':
                prompt = `请基于以下邮件内容生成一个专业的回复：\n\n${targetText}\n\n请用中文回复，语气要礼貌专业。`;
                break;
            case 'improve':
                prompt = `请改进以下文本，使其更加清晰和专业：\n\n${targetText}`;
                break;
            case 'translate':
                // 检测语言并相应翻译
                const isChinese = /[\u4e00-\u9fff]/.test(targetText);
                if (isChinese) {
                    prompt = `请将以下中文文本翻译成英文：\n\n${targetText}`;
                } else {
                    prompt = `请将以下英文文本翻译成中文：\n\n${targetText}`;
                }
                break;
            case 'summarize':
                prompt = `请总结以下内容的要点：\n\n${targetText}`;
                break;
            case 'formal':
                prompt = `请将以下文本改写得更加正式和专业：\n\n${targetText}`;
                break;
            case 'friendly':
                prompt = `请将以下文本改写得更加友好和亲切：\n\n${targetText}`;
                break;
            case 'custom':
                prompt = `${request.customPrompt}\n\n内容：${targetText}`;
                break;
        }
        
        if (prompt) {
            console.log('Sending prompt to AI:', prompt.substring(0, 200) + '...');
            this.showNotification('AI正在处理中...', 'loading');
            
            const response = await this.callOpenAI(prompt);
            
            if (response) {
                console.log('Received AI response:', response.substring(0, 200) + '...');
                this.insertResponse(response, request.action === 'reply');
                this.showNotification('AI处理完成！', 'success');
            } else {
                this.showNotification('AI处理失败，请检查API Key或网络', 'error');
            }
        }
    }
    
    // 新增：获取页面文本内容
    getPageText() {
        // 尝试从邮件列表或其他地方获取文本
        const textSources = [
            '.ms-MessageBody',
            '[role="main"]',
            '.ms-rte-editor',
            '.allowTextSelection'
        ];
        
        for (let selector of textSources) {
            const element = document.querySelector(selector);
            if (element) {
                const text = element.innerText || element.textContent || '';
                if (text.trim() && text.length > 10) {
                    console.log('Found page text from:', selector);
                    return text.trim();
                }
            }
        }
        
        return '';
    }
    
    async callOpenAI(prompt) {
        console.log('Calling OpenAI API...');
        
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: '你是一个专业的邮件写作助手。请提供清晰、专业、有用的回复。如果用户的内容是英文，请用英文回复；如果是中文，请用中文回复。'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 1500,
                    temperature: 0.7
                })
            });
            
            const data = await response.json();
            console.log('OpenAI response status:', response.status);
            console.log('OpenAI response:', data);
            
            if (data.error) {
                console.error('OpenAI error:', data.error);
                this.showNotification(`OpenAI错误: ${data.error.message}`, 'error');
                return null;
            }
            
            if (response.ok && data.choices && data.choices[0]) {
                return data.choices[0].message.content.trim();
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('API call failed:', error);
            this.showNotification(`网络错误: ${error.message}`, 'error');
            return null;
        }
    }
    
    getSelectedText() {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        console.log('Selected text detection:', {
            hasSelection: selection.rangeCount > 0,
            isCollapsed: selection.isCollapsed,
            selectedText: selectedText,
            length: selectedText.length
        });
        return selectedText;
    }
    
    getEmailContent() {
        const composeArea = this.findComposeArea();
        if (composeArea) {
            const methods = [
                () => composeArea.innerText,
                () => composeArea.textContent,
                () => composeArea.value,
                () => composeArea.innerHTML.replace(/<[^>]*>/g, '')
            ];
            
            for (let method of methods) {
                try {
                    const content = method();
                    if (content && content.trim()) {
                        console.log('Email content extracted using method:', method.toString());
                        return content.trim();
                    }
                } catch (e) {
                    console.log('Method failed:', e);
                }
            }
        }
        
        console.log('No email content found in compose area');
        return '';
    }
    
    findComposeArea() {
        let selectors = [];
        
        if (this.platform === 'outlook') {
            selectors = [
                '[contenteditable="true"][aria-label*="Message body"]',
                '[contenteditable="true"][role="textbox"]',
                '.ms-rte-editor[contenteditable="true"]',
                'div[contenteditable="true"][data-testid="rooster-editor"]',
                '.allowTextSelection[contenteditable="true"]',
                '[contenteditable="true"]'
            ];
        } else {
            selectors = [
                '[contenteditable="true"][aria-label*="邮件正文"]',
                '[contenteditable="true"][role="textbox"]',
                '[contenteditable="true"]'
            ];
        }
        
        for (let selector of selectors) {
            const elements = document.querySelectorAll(selector);
            for (let element of elements) {
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                
                if (rect.width > 200 && rect.height > 100 && 
                    style.display !== 'none' && 
                    style.visibility !== 'hidden') {
                    console.log('Found compose area:', selector, element);
                    return element;
                }
            }
        }
        
        console.warn('No compose area found');
        return null;
    }
    
    insertResponse(response, isReply = false) {
        console.log('Inserting response:', response.substring(0, 100) + '...');
        
        const composeArea = this.findComposeArea();
        
        if (!composeArea) {
            console.error('Cannot find compose area for insertion');
            this.showResponseModal(response);
            return;
        }
        
        try {
            // 保存当前光标位置
            const selection = window.getSelection();
            const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
            
            if (isReply) {
                // 替换所有内容
                composeArea.innerHTML = '';
                composeArea.textContent = response;
            } else {
                // 在光标位置插入内容
                if (range && !range.collapsed) {
                    // 有选中文本，替换选中的内容
                    range.deleteContents();
                    range.insertNode(document.createTextNode(response));
                } else {
                    // 在末尾添加
                    const currentContent = composeArea.textContent || '';
                    const newContent = currentContent + (currentContent ? '\n\n' : '') + response;
                    composeArea.textContent = newContent;
                }
            }
            
            // 聚焦并设置光标到末尾
            composeArea.focus();
            const newRange = document.createRange();
            newRange.selectNodeContents(composeArea);
            newRange.collapse(false);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            // 触发输入事件以确保Outlook检测到变化
            const inputEvent = new Event('input', { bubbles: true });
            composeArea.dispatchEvent(inputEvent);
            
            // 高亮效果
            this.highlightInsertedContent(composeArea);
            
            console.log('Response inserted successfully');
            
        } catch (error) {
            console.error('Error inserting response:', error);
            this.showResponseModal(response);
        }
    }
    
    highlightInsertedContent(element) {
        const originalBg = element.style.backgroundColor;
        element.style.backgroundColor = '#e0f2fe';
        element.style.transition = 'background-color 0.3s ease';
        
        setTimeout(() => {
            element.style.backgroundColor = originalBg;
        }, 2000);
    }
    
    showResponseModal(response) {
        // 创建模态窗口显示结果
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
            z-index: 100002;
            max-width: 600px;
            max-height: 70vh;
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;
        
        modal.innerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; background: #f8fafc; border-radius: 12px 12px 0 0;">
                <h3 style="margin: 0; color: #1f2937; font-size: 18px;">🤖 AI处理结果</h3>
                <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">请复制以下内容到邮件编辑器中</p>
            </div>
            <div style="padding: 20px; overflow-y: auto; flex-grow: 1;">
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; font-family: inherit;">${response}</div>
            </div>
            <div style="padding: 20px; border-top: 1px solid #e5e7eb; display: flex; gap: 10px; justify-content: flex-end; background: #f8fafc; border-radius: 0 0 12px 12px;">
                <button id="copy-response" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 500;">复制内容</button>
                <button id="close-modal" style="background: #6b7280; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; cursor: pointer;">关闭</button>
            </div>
        `;
        
        // 添加背景遮罩
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 100001;
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(modal);
        
        // 复制按钮
        modal.querySelector('#copy-response').addEventListener('click', () => {
            navigator.clipboard.writeText(response).then(() => {
                this.showNotification('内容已复制到剪贴板！', 'success');
            });
        });
        
        // 关闭按钮
        const closeModal = () => {
            modal.remove();
            overlay.remove();
        };
        
        modal.querySelector('#close-modal').addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);
    }
    
    showNotification(message, type) {
        console.log('Showing notification:', message, type);
        
        // 移除已存在的通知
        const existing = document.getElementById('ai-notification');
        if (existing) {
            existing.remove();
        }
        
        const notification = document.createElement('div');
        notification.id = 'ai-notification';
        notification.textContent = message;
        
        let bgColor, textColor, borderColor, icon;
        switch (type) {
            case 'success':
                bgColor = '#d1fae5';
                textColor = '#065f46';
                borderColor = '#a7f3d0';
                icon = '✅';
                break;
            case 'error':
                bgColor = '#fee2e2';
                textColor = '#991b1b';
                borderColor = '#fecaca';
                icon = '❌';
                break;
            case 'loading':
                bgColor = '#dbeafe';
                textColor = '#1e40af';
                borderColor = '#93c5fd';
                icon = '⏳';
                break;
        }
        
        notification.innerHTML = `${icon} ${message}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 100001;
            max-width: 400px;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
            background: ${bgColor};
            color: ${textColor};
            border: 1px solid ${borderColor};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(notification);
        
        // 自动移除
        const autoRemoveTime = type === 'loading' ? 0 : (type === 'error' ? 6000 : 4000);
        if (autoRemoveTime > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, autoRemoveTime);
        }
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new EmailAssistant());
} else {
    new EmailAssistant();
}

// 也在页面完全加载后初始化
window.addEventListener('load', () => {
    setTimeout(() => {
        if (!window.emailAssistant) {
            window.emailAssistant = new EmailAssistant();
        }
    }, 2000);
});

// 监听页面变化，适应Outlook的动态加载
const observer = new MutationObserver((mutations) => {
    let shouldReinit = false;
    
    mutations.forEach((mutation) => {
        // 检查是否有新的编辑器出现
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.querySelector && node.querySelector('[contenteditable="true"]')) {
                        shouldReinit = true;
                    }
                }
            });
        }
    });
    
    if (shouldReinit && !document.getElementById('ai-assistant-btn')) {
        console.log('Detected new editor, reinitializing...');
        setTimeout(() => {
            if (window.emailAssistant) {
                window.emailAssistant.addAIButton();
            }
        }, 1000);
    }
});

// 开始观察页面变化
observer.observe(document.body, {
    childList: true,
    subtree: true
});

console.log('Outlook-optimized content script initialization completed');