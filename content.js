// 增强版 content.js - 智能写作提示功能
console.log('Enhanced Writing Assistant Loaded');

class EmailAssistant {
    constructor() {
        this.apiKey = '';
        this.isTyping = false;
        this.typingTimer = null;
        this.lastSuggestionTime = 0;
        this.currentEditor = null;
        this.suggestionPopup = null;
        this.init();
    }
    
    async init() {
        console.log('EmailAssistant initializing with contextual writing...');
        
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
            this.setupSmartWritingAssistant();
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
    
    // 新增：设置智能写作助手
    setupSmartWritingAssistant() {
        console.log('Setting up smart writing assistant...');
        
        // 监听编辑器变化
        this.monitorEditors();
        
        // 创建智能提示样式
        this.injectSmartStyles();
    }
    
    // 新增：注入智能提示相关样式
    injectSmartStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .ai-writing-suggestion {
                position: absolute;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 500;
                box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
                z-index: 100000;
                max-width: 300px;
                cursor: pointer;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                line-height: 1.4;
                animation: suggestionFadeIn 0.3s ease-out;
                border: 1px solid rgba(255,255,255,0.2);
            }
            
            @keyframes suggestionFadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .ai-writing-suggestion:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 40px rgba(102, 126, 234, 0.4);
            }
            
            .ai-writing-suggestion::before {
                content: '💡';
                margin-right: 6px;
            }
            
            .ai-writing-suggestion::after {
                content: '';
                position: absolute;
                bottom: -6px;
                left: 20px;
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 6px solid #667eea;
            }
            
            .ai-context-panel {
                position: fixed;
                top: 100px;
                right: 20px;
                width: 320px;
                background: white;
                border: 1px solid #e1e5e9;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.12);
                z-index: 99999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                max-height: 400px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .ai-context-panel-header {
                padding: 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                font-weight: 600;
                font-size: 14px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .ai-context-panel-content {
                padding: 16px;
                overflow-y: auto;
                flex-grow: 1;
            }
            
            .ai-suggestion-item {
                padding: 12px;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                margin-bottom: 10px;
                cursor: pointer;
                transition: all 0.2s ease;
                background: #fafafa;
            }
            
            .ai-suggestion-item:hover {
                border-color: #667eea;
                background: #f8faff;
                transform: translateY(-1px);
            }
            
            .ai-suggestion-title {
                font-weight: 500;
                color: #1f2937;
                font-size: 13px;
                margin-bottom: 4px;
            }
            
            .ai-suggestion-preview {
                color: #6b7280;
                font-size: 12px;
                line-height: 1.4;
            }
        `;
        document.head.appendChild(style);
    }
    
    // 新增：监控编辑器输入
    monitorEditors() {
        const checkForEditors = () => {
            const editors = this.findAllEditors();
            editors.forEach(editor => {
                if (!editor.hasSmartAssistant) {
                    this.attachSmartAssistant(editor);
                    editor.hasSmartAssistant = true;
                }
            });
        };
        
        // 初始检查
        checkForEditors();
        
        // 定期检查新编辑器
        setInterval(checkForEditors, 3000);
        
        // 监听DOM变化
        const observer = new MutationObserver(() => {
            setTimeout(checkForEditors, 1000);
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // 新增：查找所有编辑器
    findAllEditors() {
        const selectors = [
            '[contenteditable="true"][aria-label*="Message body"]',
            '[contenteditable="true"][role="textbox"]',
            '.ms-rte-editor[contenteditable="true"]',
            'div[contenteditable="true"][data-testid="rooster-editor"]',
            '.allowTextSelection[contenteditable="true"]',
            '[contenteditable="true"][aria-label*="邮件正文"]',
            '[contenteditable="true"]'
        ];
        
        const editors = [];
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                const rect = element.getBoundingClientRect();
                if (rect.width > 200 && rect.height > 100) {
                    editors.push(element);
                }
            });
        });
        
        return editors;
    }
    
    // 新增：为编辑器附加智能助手
    attachSmartAssistant(editor) {
        console.log('Attaching smart assistant to editor:', editor);
        
        let typingTimer = null;
        let lastContent = '';
        
        // 输入事件监听
        const onInput = (e) => {
            clearTimeout(typingTimer);
            
            const currentContent = editor.innerText || editor.textContent || '';
            
            // 检查是否有实际内容变化
            if (currentContent !== lastContent && currentContent.trim().length > 10) {
                typingTimer = setTimeout(() => {
                    this.analyzeContextAndSuggest(editor, currentContent);
                }, 2000); // 停止输入2秒后触发建议
            }
            
            lastContent = currentContent;
        };
        
        // 键盘事件监听
        const onKeyDown = (e) => {
            // Tab键接受建议
            if (e.key === 'Tab' && this.suggestionPopup) {
                e.preventDefault();
                this.acceptSuggestion();
            }
            
            // Escape键关闭建议
            if (e.key === 'Escape' && this.suggestionPopup) {
                this.closeSuggestion();
            }
            
            // 空格键或句号后可能触发快速建议
            if ((e.key === ' ' || e.key === '.' || e.key === '？' || e.key === '?') && this.apiKey) {
                setTimeout(() => {
                    const content = editor.innerText || editor.textContent || '';
                    if (content.trim().length > 20) {
                        this.quickContextSuggestion(editor, content);
                    }
                }, 500);
            }
        };
        
        // 焦点事件
        const onFocus = () => {
            this.currentEditor = editor;
        };
        
        const onBlur = () => {
            setTimeout(() => {
                if (this.suggestionPopup && !this.suggestionPopup.matches(':hover')) {
                    this.closeSuggestion();
                }
            }, 200);
        };
        
        // 绑定事件
        editor.addEventListener('input', onInput);
        editor.addEventListener('keydown', onKeyDown);
        editor.addEventListener('focus', onFocus);
        editor.addEventListener('blur', onBlur);
        
        // 存储事件处理器以便后续清理
        editor.smartAssistantHandlers = {
            onInput, onKeyDown, onFocus, onBlur
        };
    }
    
    // 新增：分析上下文并提供建议
    async analyzeContextAndSuggest(editor, content) {
        if (!this.apiKey || content.length < 20) return;
        
        // 防止过频繁的请求
        const now = Date.now();
        if (now - this.lastSuggestionTime < 5000) return;
        this.lastSuggestionTime = now;
        
        console.log('Analyzing context for suggestions...');
        
        try {
            // 分析邮件上下文
            const context = this.analyzeEmailContext(content);
            const suggestions = await this.generateContextualSuggestions(content, context);
            
            if (suggestions && suggestions.length > 0) {
                this.showContextualSuggestions(editor, suggestions, context);
            }
        } catch (error) {
            console.error('Error generating contextual suggestions:', error);
        }
    }
    
    // 新增：快速上下文建议（用于空格/句号后）
    async quickContextSuggestion(editor, content) {
        if (!this.apiKey) return;
        
        // 获取当前句子
        const sentences = content.split(/[.!?。！？]/);
        const currentSentence = sentences[sentences.length - 1].trim();
        
        if (currentSentence.length < 10) return;
        
        try {
            const suggestion = await this.generateQuickSuggestion(currentSentence, content);
            if (suggestion) {
                this.showInlineSuggestion(editor, suggestion);
            }
        } catch (error) {
            console.error('Error generating quick suggestion:', error);
        }
    }
    
    // 新增：分析邮件上下文
    analyzeEmailContext(content) {
        const context = {
            type: 'unknown',
            tone: 'neutral',
            language: 'mixed',
            intent: 'general',
            urgency: 'normal',
            recipientType: 'unknown'
        };
        
        // 检测语言
        const chineseRatio = (content.match(/[\u4e00-\u9fff]/g) || []).length / content.length;
        context.language = chineseRatio > 0.3 ? 'chinese' : 'english';
        
        // 检测邮件类型
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('meeting') || lowerContent.includes('会议') || lowerContent.includes('schedule')) {
            context.type = 'meeting';
        } else if (lowerContent.includes('report') || lowerContent.includes('报告') || lowerContent.includes('update')) {
            context.type = 'report';
        } else if (lowerContent.includes('request') || lowerContent.includes('请求') || lowerContent.includes('需要')) {
            context.type = 'request';
        } else if (lowerContent.includes('thank') || lowerContent.includes('感谢')) {
            context.type = 'gratitude';
        } else if (lowerContent.includes('follow up') || lowerContent.includes('跟进')) {
            context.type = 'followup';
        }
        
        // 检测语气
        if (lowerContent.includes('urgent') || lowerContent.includes('asap') || lowerContent.includes('紧急')) {
            context.urgency = 'high';
            context.tone = 'urgent';
        } else if (lowerContent.includes('please') || lowerContent.includes('请') || lowerContent.includes('谢谢')) {
            context.tone = 'polite';
        }
        
        // 检测收件人类型
        if (lowerContent.includes('dear') || lowerContent.includes('hi') || lowerContent.includes('hello')) {
            context.recipientType = 'external';
        } else if (lowerContent.includes('team') || lowerContent.includes('everyone') || lowerContent.includes('同事')) {
            context.recipientType = 'team';
        }
        
        return context;
    }
    
    // 新增：生成上下文建议
    async generateContextualSuggestions(content, context) {
        const prompt = `作为专业的邮件写作助手，请根据以下邮件内容和上下文信息，提供3个有用的写作建议：

邮件内容：
${content}

上下文信息：
- 邮件类型：${context.type}
- 语言：${context.language}
- 语气：${context.tone}
- 紧急程度：${context.urgency}

请提供以下格式的建议：
1. 建议标题|具体建议内容（20-40字）
2. 建议标题|具体建议内容（20-40字）  
3. 建议标题|具体建议内容（20-40字）

建议应该针对当前内容，帮助完善邮件的表达、结构或礼貌程度。`;

        try {
            const response = await this.callOpenAI(prompt, 0.8, 500);
            if (response) {
                return this.parseSuggestions(response);
            }
        } catch (error) {
            console.error('Error calling OpenAI for suggestions:', error);
        }
        
        return null;
    }
    
    // 新增：生成快速建议
    async generateQuickSuggestion(currentSentence, fullContent) {
        const prompt = `根据这个邮件的上下文："${fullContent.substring(0, 200)}..."，为当前句子"${currentSentence}"提供一个简短的继续建议（10-20字），帮助完成表达：`;
        
        try {
            const response = await this.callOpenAI(prompt, 0.9, 100);
            return response ? response.trim() : null;
        } catch (error) {
            console.error('Error generating quick suggestion:', error);
            return null;
        }
    }
    
    // 新增：解析建议格式
    parseSuggestions(response) {
        const suggestions = [];
        const lines = response.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
            const match = line.match(/^\d+\.\s*(.+?)\|(.+)/);
            if (match) {
                suggestions.push({
                    title: match[1].trim(),
                    content: match[2].trim()
                });
            }
        });
        
        return suggestions.length > 0 ? suggestions : null;
    }
    
    // 新增：显示上下文建议面板
    showContextualSuggestions(editor, suggestions, context) {
        // 移除已存在的面板
        const existing = document.getElementById('ai-context-panel');
        if (existing) {
            existing.remove();
        }
        
        const panel = document.createElement('div');
        panel.id = 'ai-context-panel';
        panel.className = 'ai-context-panel';
        
        panel.innerHTML = `
            <div class="ai-context-panel-header">
                <span>🎯 智能写作建议</span>
                <span style="cursor: pointer; font-size: 16px;" onclick="this.parentNode.parentNode.remove()">×</span>
            </div>
            <div class="ai-context-panel-content">
                ${suggestions.map(suggestion => `
                    <div class="ai-suggestion-item" data-suggestion="${encodeURIComponent(suggestion.content)}">
                        <div class="ai-suggestion-title">${suggestion.title}</div>
                        <div class="ai-suggestion-preview">${suggestion.content}</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // 绑定点击事件
        panel.querySelectorAll('.ai-suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const suggestionText = decodeURIComponent(item.dataset.suggestion);
                this.applySuggestion(editor, suggestionText);
                panel.remove();
            });
        });
        
        // 5秒后自动隐藏
        setTimeout(() => {
            if (panel.parentNode) {
                panel.style.opacity = '0.7';
                panel.style.transition = 'opacity 0.3s ease';
            }
        }, 5000);
        
        // 10秒后完全移除
        setTimeout(() => {
            if (panel.parentNode) {
                panel.remove();
            }
        }, 10000);
    }
    
    // 新增：显示内联建议
    showInlineSuggestion(editor, suggestion) {
        // 移除已存在的建议
        this.closeSuggestion();
        
        const rect = editor.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        this.suggestionPopup = document.createElement('div');
        this.suggestionPopup.className = 'ai-writing-suggestion';
        this.suggestionPopup.textContent = suggestion;
        this.suggestionPopup.setAttribute('data-suggestion', suggestion);
        
        // 定位到编辑器附近
        this.suggestionPopup.style.top = (rect.bottom + scrollTop + 10) + 'px';
        this.suggestionPopup.style.left = (rect.left + 20) + 'px';
        
        document.body.appendChild(this.suggestionPopup);
        
        // 点击应用建议
        this.suggestionPopup.addEventListener('click', () => {
            this.acceptSuggestion();
        });
        
        // 3秒后自动淡出
        setTimeout(() => {
            if (this.suggestionPopup) {
                this.suggestionPopup.style.opacity = '0.6';
            }
        }, 3000);
        
        // 6秒后自动移除
        setTimeout(() => {
            this.closeSuggestion();
        }, 6000);
    }
    
    // 新增：接受建议
    acceptSuggestion() {
        if (!this.suggestionPopup || !this.currentEditor) return;
        
        const suggestion = this.suggestionPopup.getAttribute('data-suggestion');
        if (suggestion) {
            this.applySuggestion(this.currentEditor, suggestion);
        }
        
        this.closeSuggestion();
    }
    
    // 新增：应用建议到编辑器
    applySuggestion(editor, suggestion) {
        try {
            // 获取当前光标位置
            const selection = window.getSelection();
            
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                
                // 在光标位置插入建议
                const textNode = document.createTextNode(suggestion);
                range.insertNode(textNode);
                
                // 设置光标到插入文本之后
                range.setStartAfter(textNode);
                range.setEndAfter(textNode);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                // 如果没有光标位置，追加到末尾
                const currentContent = editor.innerText || editor.textContent || '';
                editor.textContent = currentContent + ' ' + suggestion;
            }
            
            // 触发输入事件
            const inputEvent = new Event('input', { bubbles: true });
            editor.dispatchEvent(inputEvent);
            
            // 聚焦编辑器
            editor.focus();
            
            this.showNotification('建议已应用！', 'success');
            
        } catch (error) {
            console.error('Error applying suggestion:', error);
            // 备用方案：复制到剪贴板
            navigator.clipboard.writeText(suggestion).then(() => {
                this.showNotification('建议已复制到剪贴板！', 'success');
            });
        }
    }
    
    // 新增：关闭建议
    closeSuggestion() {
        if (this.suggestionPopup) {
            this.suggestionPopup.remove();
            this.suggestionPopup = null;
        }
    }
    
    // 修改原有的addAIButton方法，添加更多上下文功能
    addAIButton() {
        console.log('Adding enhanced AI button for', this.platform);
        
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
            for (let element of elements) {
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                
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
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 8px;
                margin: 8px;
                align-items: center;
            `;
            
            // 主AI按钮
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
                box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
                transition: all 0.2s ease;
                z-index: 99999;
                position: relative;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            `;
            
            // 智能写作按钮
            const smartWritingButton = document.createElement('button');
            smartWritingButton.innerHTML = '💡 智能写作';
            smartWritingButton.style.cssText = `
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
                transition: all 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            `;
            
            // 状态指示器
            const statusIndicator = document.createElement('div');
            statusIndicator.id = 'smart-writing-status';
            statusIndicator.innerHTML = this.apiKey ? '✅ 智能提示已启用' : '⚠️ 需要设置API Key';
            statusIndicator.style.cssText = `
                font-size: 11px;
                color: ${this.apiKey ? '#059669' : '#d97706'};
                font-weight: 500;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            `;
            
            // 添加悬停效果
            [aiButton, smartWritingButton].forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    btn.style.transform = 'translateY(-2px)';
                    btn.style.boxShadow = btn === aiButton ? 
                        '0 4px 12px rgba(79, 70, 229, 0.4)' : 
                        '0 4px 12px rgba(16, 185, 129, 0.4)';
                });
                
                btn.addEventListener('mouseleave', () => {
                    btn.style.transform = 'translateY(0)';
                    btn.style.boxShadow = btn === aiButton ? 
                        '0 2px 8px rgba(79, 70, 229, 0.3)' : 
                        '0 2px 6px rgba(16, 185, 129, 0.3)';
                });
            });
            
            // 事件监听
            aiButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showAIMenu(e.target);
            });
            
            smartWritingButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleSmartWritingMode(composeArea);
            });
            
            // 组装按钮
            buttonContainer.appendChild(aiButton);
            buttonContainer.appendChild(smartWritingButton);
            buttonContainer.appendChild(statusIndicator);
            
            // 添加到页面
            try {
                const toolbar = document.querySelector('[role="toolbar"]') || 
                               document.querySelector('.ms-rte-toolbar') ||
                               composeArea.parentNode;
                
                if (toolbar && toolbar !== composeArea) {
                    toolbar.appendChild(buttonContainer);
                } else {
                    composeArea.parentNode.insertBefore(buttonContainer, composeArea);
                }
                console.log('AI buttons added successfully');
            } catch (error) {
                console.error('Error adding buttons:', error);
                document.body.appendChild(buttonContainer);
                buttonContainer.style.position = 'fixed';
                buttonContainer.style.top = '100px';
                buttonContainer.style.right = '20px';
            }
        } else if (!composeArea) {
            console.log('No suitable compose area found, will retry...');
            setTimeout(() => {
                this.addAIButton();
            }, 5000);
        }
    }
    
    // 新增：切换智能写作模式
    toggleSmartWritingMode(editor) {
        if (!this.apiKey) {
            this.showNotification('请先设置OpenAI API Key', 'error');
            return;
        }
        
        const isActive = editor.hasAttribute('data-smart-writing');
        
        if (isActive) {
            // 关闭智能写作
            editor.removeAttribute('data-smart-writing');
            this.showNotification('智能写作提示已关闭', 'success');
            this.closeSuggestion();
        } else {
            // 开启智能写作