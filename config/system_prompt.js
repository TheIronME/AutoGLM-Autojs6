/**
 * 系统提示词配置
 * 定义 AI 模型的系统提示词 (中英文)
 * 
 * 注意：使用 Function Call 模式时，参数定义通过 tools 的 JSON Schema 传递
 * 提示词只需提供高层描述和使用说明
 * 
 * 模式说明：
 * - XML 模式：解析 UI 元素树，使用绝对像素坐标
 * - 截图模式：使用截图，使用相对坐标 (0-999)
 * 
 * 提示词文件已拆分到 prompts/ 目录（Markdown 格式）：
 * - prompts/xml_cn.md      - XML 模式中文提示词
 * - prompts/xml_base.md    - XML 模式英文提示词
 * - prompts/screenshot_cn.md  - 截图模式中文提示词
 * - prompts/screenshot_base.md - 截图模式英文提示词
 */

// 获取当前脚本所在目录
var cwd = engines.myEngine().cwd();

// 读取 Markdown 提示词文件
var XML_CN = files.read(cwd + '/prompts/xml_cn.md');
var XML_BASE = files.read(cwd + '/prompts/xml_base.md');
var SCREENSHOT_CN = files.read(cwd + '/prompts/screenshot_cn.md');
var SCREENSHOT_BASE = files.read(cwd + '/prompts/screenshot_base.md');

var SYSTEM_PROMPTS = {
    // ========================================
    // XML 模式提示词（使用绝对像素坐标）
    // ========================================
    XML_CN: XML_CN,
    XML_BASE: XML_BASE,
    
    // ========================================
    // 截图模式提示词（使用相对坐标 0-999）
    // ========================================
    SCREENSHOT_CN: SCREENSHOT_CN,
    SCREENSHOT_BASE: SCREENSHOT_BASE,
    
    // ========================================
    // 兼容旧代码的别名（默认使用截图模式）
    // ========================================
    CN: SCREENSHOT_CN,
    BASE: SCREENSHOT_BASE
};

// ========================================
// 根据模式获取提示词的辅助函数
// ========================================
SYSTEM_PROMPTS.getPrompt = function(mode, lang) {
    var modeKey = (mode === 'xml') ? 'XML' : 'SCREENSHOT';
    var langKey = (lang === 'cn' || lang === 'CN') ? 'CN' : 'BASE';
    return SYSTEM_PROMPTS[modeKey + '_' + langKey];
};

module.exports = SYSTEM_PROMPTS;