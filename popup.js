/* =================== popup.js =================== */

console.log('Popup script loaded');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event fired');
    
    // 加载保存的API Key
    chrome.storage.sync.get(['openai_api_key'], function(result) {
        if (result.openai_api_key) {
            document.getElementById('apiKey').value = result.openai_api_key;
        }
    });
    
    // 保存API Key
    const saveKeyBtn = document.getElementById('saveKey');
    if (saveKeyBtn) {
        saveKeyBtn.addEventListener('click', function() {
            console.log('Save key clicked');
            const apiKey = document.getElementById('apiKey').value.trim();
            if (apiKey) {
                chrome.storage.sync.set({openai_api_key: apiKey}, function() {
                    console.log('API Key saved');
                    showStatus('API Key 已保存', 'success');
                });
            } else {
                showStatus('请输入有效的API Key', 'error');
            }
        });
    }
    
    // 生成回复
    const generateReplyBtn = document.getElementById('generateReply');
    if (generateReplyBtn) {
        generateReplyBtn.addEventListener('click', function() {
            console.log('Generate reply clicked');
            executeCommand('reply');
        });
    }
    
    // 改进文本
    const improveTextBtn = document.getElementById('improveText');
    if (improveTextBtn) {
        improveTextBtn.addEventListener('click', function() {
            console.log('Improve text clicked');
            executeCommand('improve');
        });
    }
    
    // 翻译
    const translateTextBtn = document.getElementById('translateText');
    if (translateTextBtn) {
        translateTextBtn.addEventListener('click', function() {
            console.log('Translate text clicked');
            executeCommand('translate');
        });
    }
    
    // 总结
    const summarizeTextBtn = document.getElementById('summarizeText');
    if (summarizeTextBtn) {
        summarizeTextBtn.addEventListener('click', function() {
            console.log('Summarize text clicked');
            executeCommand('summarize');
        });
    }
    
    // 执行自定义命令
    const executeCustomBtn = document.getElementById('executeCustom');
    if (executeCustomBtn) {
        executeCustomBtn.addEventListener('click', function() {
            console.log('Execute custom clicked');
            const prompt = document.getElementById('customPrompt').value.trim();
            if (prompt) {
                executeCommand('custom', prompt);
            } else {
                showStatus('请输入自定义提示词', 'error');
            }
        });
    }
    
    function executeCommand(type, customPrompt = '') {
        console.log('Executing command:', type);
        
        // 检查是否有API Key
        chrome.storage.sync.get(['openai_api_key'], function(result) {
            if (!result.openai_api_key) {
                showStatus('请先设置API Key', 'error');
                return;
            }
            
            // 获取当前活动标签页
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                const currentTab = tabs[0];
                console.log('Current tab URL:', currentTab.url);
                
                // 检查是否在支持的邮件网站
                if (currentTab.url.includes('mail.google.com') || 
                    currentTab.url.includes('outlook.live.com') || 
                    currentTab.url.includes('outlook.office.com')) {
                    
                    // 发送消息到content script
                    chrome.tabs.sendMessage(currentTab.id, {
                        action: type,
                        customPrompt: customPrompt
                    }, function(response) {
                        if (chrome.runtime.lastError) {
                            console.error('Error sending message:', chrome.runtime.lastError);
                            showStatus('请刷新邮件页面后重试', 'error');
                        } else {
                            console.log('Message sent successfully');
                            showStatus('正在处理...', 'loading');
                            // 延迟关闭弹窗
                            setTimeout(() => {
                                window.close();
                            }, 1500);
                        }
                    });
                } else {
                    showStatus('请在Gmail或Outlook页面使用', 'error');
                }
            });
        });
    }
    
    function showStatus(message, type) {
        console.log('Showing status:', message, type);
        const status = document.getElementById('status');
        if (status) {
            status.textContent = message;
            status.className = `status ${type}`;
            
            // 3秒后隐藏状态
            if (type !== 'loading') {
                setTimeout(() => {
                    status.className = 'status';
                    status.textContent = '';
                }, 3000);
            }
        }
    }
});