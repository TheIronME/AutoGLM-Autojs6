/**
 * 列出 app 模块的所有函数和属性
 * 
 * 用于探索 AutoJS app 模块的 API 结构
 */

// 日志分隔线
function logSeparator(title) {
    console.log("\n" + "=".repeat(60));
    console.log(" " + title);
    console.log("=".repeat(60));
}

// 检查是否为函数
function isFunction(value) {
    return typeof value === 'function';
}

// 检查是否与关键词相关
function isKeywordRelated(name, keywords) {
    var lowerName = name.toLowerCase();
    for (var i = 0; i < keywords.length; i++) {
        if (lowerName.indexOf(keywords[i].toLowerCase()) !== -1) {
            return true;
        }
    }
    return false;
}

// 主函数
function main() {
    logSeparator("app 模块函数和属性列表");

    // 检查 app 对象是否存在
    if (typeof app === 'undefined') {
        console.error("错误: app 模块不存在!");
        console.log("请确保在 AutoJS 环境中运行此脚本");
        return;
    }

    // 收集所有属性
    var functions = [];
    var properties = [];
    var keywordRelatedFunctions = [];
    
    var keywords = ['install', 'package', 'app', 'launch'];

    // 遍历 app 对象的所有属性
    for (var key in app) {
        if (app.hasOwnProperty(key)) {
            var value = app[key];
            var item = {
                name: key,
                type: typeof value
            };

            if (isFunction(value)) {
                functions.push(item);
                
                // 检查是否与关键词相关
                if (isKeywordRelated(key, keywords)) {
                    keywordRelatedFunctions.push(item);
                }
            } else {
                properties.push(item);
            }
        }
    }

    // 输出统计信息
    console.log("\n[统计信息]");
    console.log("  函数总数: " + functions.length);
    console.log("  属性总数: " + properties.length);
    console.log("  关键词相关函数: " + keywordRelatedFunctions.length + " (关键词: " + keywords.join(", ") + ")");

    // 输出关键词相关函数（优先显示）
    if (keywordRelatedFunctions.length > 0) {
        logSeparator("关键词相关函数 (install, package, app, launch)");
        for (var i = 0; i < keywordRelatedFunctions.length; i++) {
            var func = keywordRelatedFunctions[i];
            console.log("  [" + (i + 1) + "] " + func.name + "()");
        }
    }

    // 输出所有函数
    logSeparator("所有函数列表");
    if (functions.length > 0) {
        // 按字母排序
        functions.sort(function(a, b) {
            return a.name.localeCompare(b.name);
        });
        
        for (var i = 0; i < functions.length; i++) {
            var func = functions[i];
            var marker = isKeywordRelated(func.name, keywords) ? " ★" : "";
            console.log("  [" + (i + 1) + "] " + func.name + "()" + marker);
        }
        console.log("\n  (★ 表示与关键词相关)");
    } else {
        console.log("  无函数");
    }

    // 输出所有属性
    logSeparator("所有属性列表");
    if (properties.length > 0) {
        // 按字母排序
        properties.sort(function(a, b) {
            return a.name.localeCompare(b.name);
        });
        
        for (var i = 0; i < properties.length; i++) {
            var prop = properties[i];
            var value = app[prop.name];
            var valueStr = "";
            
            // 尝试显示属性值
            if (value === null) {
                valueStr = "null";
            } else if (value === undefined) {
                valueStr = "undefined";
            } else if (typeof value === 'string') {
                valueStr = '"' + value + '"';
            } else if (typeof value === 'object') {
                valueStr = "[object]";
            } else {
                valueStr = String(value);
            }
            
            console.log("  [" + (i + 1) + "] " + prop.name + " : " + prop.type + " = " + valueStr);
        }
    } else {
        console.log("  无属性");
    }

    // 输出详细函数签名（可选）
    logSeparator("函数详细信息");
    console.log("以下列出部分函数的参数信息:\n");
    
    var detailedFunctions = ['launchApp', 'launch', 'launchPackage', 'getPackageName', 'getAppName', 
                             'openAppSetting', 'viewFile', 'editFile', 'uninstall', 'openUrl',
                             'sendEmail', 'startApp', 'getInstalledApps'];
    
    for (var i = 0; i < detailedFunctions.length; i++) {
        var funcName = detailedFunctions[i];
        if (app[funcName]) {
            console.log("  " + funcName + ":");
            console.log("    类型: " + typeof app[funcName]);
            console.log("    存在: ✓");
        } else {
            console.log("  " + funcName + ":");
            console.log("    存在: ✗ (此函数不可用)");
        }
    }

    logSeparator("完成");
    console.log("app 模块探索完成!");
}

// 执行主函数
main();