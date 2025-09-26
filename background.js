// ===============================
// 6. background.js - 后台脚本
// ===============================
chrome.runtime.onInstalled.addListener(() => {
    console.log('邮件AI助手扩展已安装');
});

// 处理扩展图标点击
chrome.action.onClicked.addListener((tab) => {
    // 如果需要直接在页面上执行操作而不打开弹窗
    // chrome.tabs.sendMessage(tab.id, {action: 'toggle'});
});