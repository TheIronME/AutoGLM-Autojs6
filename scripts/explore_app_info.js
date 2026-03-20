/**
 * 探索 Java PackageManager API 的相关属性
 * 特别关注区分系统应用和三方应用的属性
 * 
 * 关键点：
 * - ApplicationInfo.flags 包含 FLAG_SYSTEM (值为 1) 用于标识系统应用
 * - 可以通过 (appInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0 判断是否为系统应用
 */

// 导入 Android 类
importClass(android.content.pm.ApplicationInfo);
importClass(android.content.pm.PackageManager);

// 日志分隔线
function logSeparator(title) {
    console.log("\n" + "=".repeat(60));
    console.log(" " + title);
    console.log("=".repeat(60));
}

// 打印对象的所有属性
function printProperties(obj, name) {
    console.log("\n[" + name + "] 的属性:");
    var props = [];
    for (var key in obj) {
        try {
            var value = obj[key];
            var type = typeof value;
            if (type === 'function') {
                props.push("  " + key + ": [Function]");
            } else if (value !== null && typeof value === 'object') {
                props.push("  " + key + ": [Object] " + JSON.stringify(value).substring(0, 50));
            } else {
                props.push("  " + key + ": " + value + " (" + type + ")");
            }
        } catch (e) {
            props.push("  " + key + ": [Error reading value]");
        }
    }
    props.sort();
    for (var i = 0; i < props.length; i++) {
        console.log(props[i]);
    }
}

// 打印对象的所有方法
function printMethods(obj, name) {
    console.log("\n[" + name + "] 的方法:");
    var methods = [];
    for (var key in obj) {
        try {
            if (typeof obj[key] === 'function') {
                methods.push("  " + key + "()");
            }
        } catch (e) {
            // 忽略错误
        }
    }
    methods.sort();
    for (var i = 0; i < methods.length; i++) {
        console.log(methods[i]);
    }
}

// 打印 ApplicationInfo 的静态常量（flags 相关）
function printApplicationInfoFlags() {
    logSeparator("ApplicationInfo FLAGS 常量");
    
    var flags = [
        { name: 'FLAG_SYSTEM', value: ApplicationInfo.FLAG_SYSTEM, desc: '系统应用' },
        { name: 'FLAG_EXTERNAL_STORAGE', value: ApplicationInfo.FLAG_EXTERNAL_STORAGE, desc: '安装在外部存储' },
        { name: 'FLAG_LARGE_HEAP', value: ApplicationInfo.FLAG_LARGE_HEAP, desc: '请求大堆' },
        { name: 'FLAG_DEBUGGABLE', value: ApplicationInfo.FLAG_DEBUGGABLE, desc: '可调试' },
        { name: 'FLAG_HAS_CODE', value: ApplicationInfo.FLAG_HAS_CODE, desc: '有代码' },
        { name: 'FLAG_PERSISTENT', value: ApplicationInfo.FLAG_PERSISTENT, desc: '持久应用' },
        { name: 'FLAG_FACTORY_TEST', value: ApplicationInfo.FLAG_FACTORY_TEST, desc: '工厂测试' },
        { name: 'FLAG_ALLOW_TASK_REPARENTING', value: ApplicationInfo.FLAG_ALLOW_TASK_REPARENTING, desc: '允许任务重置' },
        { name: 'FLAG_ALLOW_CLEAR_USER_DATA', value: ApplicationInfo.FLAG_ALLOW_CLEAR_USER_DATA, desc: '允许清除用户数据' },
        { name: 'FLAG_UPDATED_SYSTEM_APP', value: ApplicationInfo.FLAG_UPDATED_SYSTEM_APP, desc: '更新的系统应用' },
        { name: 'FLAG_TEST_ONLY', value: ApplicationInfo.FLAG_TEST_ONLY, desc: '仅测试' },
        { name: 'FLAG_VM_SAFE_MODE', value: ApplicationInfo.FLAG_VM_SAFE_MODE, desc: 'VM 安全模式' },
        { name: 'FLAG_ALLOW_BACKUP', value: ApplicationInfo.FLAG_ALLOW_BACKUP, desc: '允许备份' },
        { name: 'FLAG_STOPPED', value: ApplicationInfo.FLAG_STOPPED, desc: '已停止' }
    ];
    
    console.log("\n已知的 FLAGS 常量:");
    for (var i = 0; i < flags.length; i++) {
        var flag = flags[i];
        try {
            var actualValue = ApplicationInfo[flag.name];
            if (actualValue !== undefined) {
                console.log("  " + flag.name + " = " + actualValue + " (" + flag.desc + ")");
            }
        } catch (e) {
            console.log("  " + flag.name + " = [不可用]");
        }
    }
}

// 检查应用是否为系统应用
function isSystemApp(appInfo) {
    try {
        return (appInfo.flags & ApplicationInfo.FLAG_SYSTEM) !== 0;
    } catch (e) {
        return false;
    }
}

// 检查应用是否为更新的系统应用
function isUpdatedSystemApp(appInfo) {
    try {
        return (appInfo.flags & ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) !== 0;
    } catch (e) {
        return false;
    }
}

// 获取应用的所有 flags 标志
function getAppFlags(appInfo) {
    var flagNames = [];
    var flagChecks = [
        { name: 'FLAG_SYSTEM', value: ApplicationInfo.FLAG_SYSTEM },
        { name: 'FLAG_EXTERNAL_STORAGE', value: ApplicationInfo.FLAG_EXTERNAL_STORAGE },
        { name: 'FLAG_LARGE_HEAP', value: ApplicationInfo.FLAG_LARGE_HEAP },
        { name: 'FLAG_DEBUGGABLE', value: ApplicationInfo.FLAG_DEBUGGABLE },
        { name: 'FLAG_HAS_CODE', value: ApplicationInfo.FLAG_HAS_CODE },
        { name: 'FLAG_PERSISTENT', value: ApplicationInfo.FLAG_PERSISTENT },
        { name: 'FLAG_FACTORY_TEST', value: ApplicationInfo.FLAG_FACTORY_TEST },
        { name: 'FLAG_ALLOW_TASK_REPARENTING', value: ApplicationInfo.FLAG_ALLOW_TASK_REPARENTING },
        { name: 'FLAG_ALLOW_CLEAR_USER_DATA', value: ApplicationInfo.FLAG_ALLOW_CLEAR_USER_DATA },
        { name: 'FLAG_UPDATED_SYSTEM_APP', value: ApplicationInfo.FLAG_UPDATED_SYSTEM_APP },
        { name: 'FLAG_TEST_ONLY', value: ApplicationInfo.FLAG_TEST_ONLY },
        { name: 'FLAG_VM_SAFE_MODE', value: ApplicationInfo.FLAG_VM_SAFE_MODE },
        { name: 'FLAG_ALLOW_BACKUP', value: ApplicationInfo.FLAG_ALLOW_BACKUP },
        { name: 'FLAG_STOPPED', value: ApplicationInfo.FLAG_STOPPED }
    ];
    
    for (var i = 0; i < flagChecks.length; i++) {
        var check = flagChecks[i];
        try {
            if (check.value !== undefined && (appInfo.flags & check.value) !== 0) {
                flagNames.push(check.name);
            }
        } catch (e) {
            // 忽略不可用的标志
        }
    }
    
    return flagNames;
}

// 主函数
function main() {
    logSeparator("探索 PackageManager 和 ApplicationInfo API");
    
    // 1. 获取 PackageManager
    console.log("\n[步骤 1] 获取 PackageManager...");
    try {
        var pm = context.getPackageManager();
        console.log("✓ PackageManager 获取成功");
        console.log("  类型: " + pm.getClass().getName());
        
        // 打印 PackageManager 的方法
        printMethods(pm, "PackageManager");
        
    } catch (e) {
        console.log("✗ 获取 PackageManager 失败: " + e.message);
        console.log("  错误堆栈: " + e.stack);
        return;
    }
    
    // 2. 打印 ApplicationInfo 的 FLAGS 常量
    printApplicationInfoFlags();
    
    // 3. 获取已安装应用列表
    logSeparator("获取已安装应用列表");
    
    console.log("\n[步骤 2] 调用 pm.getInstalledApplications(0)...");
    try {
        var apps = pm.getInstalledApplications(0);
        console.log("✓ 获取成功，共 " + apps.size() + " 个应用");
        
        // 4. 分析第一个应用（详细分析）
        logSeparator("详细分析第一个应用");
        
        if (apps.size() > 0) {
            var firstApp = apps.get(0);
            console.log("\n第一个应用的详细信息:");
            console.log("  类型: " + firstApp.getClass().getName());
            
            // 打印所有属性
            printProperties(firstApp, "ApplicationInfo");
            
            // 打印关键属性
            console.log("\n关键属性:");
            console.log("  packageName: " + firstApp.packageName);
            console.log("  name: " + firstApp.name);
            console.log("  sourceDir: " + firstApp.sourceDir);
            console.log("  dataDir: " + firstApp.dataDir);
            console.log("  flags: " + firstApp.flags + " (二进制: " + firstApp.flags.toString(2) + ")");
            console.log("  targetSdkVersion: " + firstApp.targetSdkVersion);
            console.log("  processName: " + firstApp.processName);
            console.log("  className: " + firstApp.className);
            console.log("  theme: " + firstApp.theme);
            console.log("  uid: " + firstApp.uid);
            
            // 检查是否为系统应用
            console.log("\n系统应用判断:");
            console.log("  isSystemApp: " + isSystemApp(firstApp));
            console.log("  isUpdatedSystemApp: " + isUpdatedSystemApp(firstApp));
            console.log("  flags 标志: " + getAppFlags(firstApp).join(", "));
        }
        
        // 5. 统计系统应用和三方应用
        logSeparator("统计系统应用和三方应用");
        
        var systemApps = [];
        var thirdPartyApps = [];
        var updatedSystemApps = [];
        
        for (var i = 0; i < apps.size(); i++) {
            var app = apps.get(i);
            var appData = {
                packageName: app.packageName,
                name: app.name || "",
                flags: app.flags,
                sourceDir: app.sourceDir
            };
            
            if (isSystemApp(app)) {
                if (isUpdatedSystemApp(app)) {
                    updatedSystemApps.push(appData);
                } else {
                    systemApps.push(appData);
                }
            } else {
                thirdPartyApps.push(appData);
            }
        }
        
        console.log("\n统计结果:");
        console.log("  系统应用 (FLAG_SYSTEM): " + systemApps.length);
        console.log("  更新的系统应用 (FLAG_UPDATED_SYSTEM_APP): " + updatedSystemApps.length);
        console.log("  三方应用: " + thirdPartyApps.length);
        console.log("  总计: " + apps.size());
        
        // 6. 输出部分系统应用示例
        logSeparator("系统应用示例 (前 10 个)");
        var displayCount = Math.min(10, systemApps.length);
        for (var j = 0; j < displayCount; j++) {
            var app = systemApps[j];
            console.log("  [" + (j + 1) + "] " + app.packageName);
            console.log("      flags: " + app.flags + " (" + getAppFlags({flags: app.flags}).join(", ") + ")");
        }
        
        // 7. 输出部分三方应用示例
        logSeparator("三方应用示例 (前 10 个)");
        displayCount = Math.min(10, thirdPartyApps.length);
        for (var k = 0; k < displayCount; k++) {
            var app = thirdPartyApps[k];
            console.log("  [" + (k + 1) + "] " + app.packageName);
            console.log("      flags: " + app.flags + " (" + getAppFlags({flags: app.flags}).join(", ") + ")");
        }
        
        // 8. 输出更新的系统应用示例
        if (updatedSystemApps.length > 0) {
            logSeparator("更新的系统应用示例 (前 10 个)");
            displayCount = Math.min(10, updatedSystemApps.length);
            for (var m = 0; m < displayCount; m++) {
                var app = updatedSystemApps[m];
                console.log("  [" + (m + 1) + "] " + app.packageName);
                console.log("      flags: " + app.flags + " (" + getAppFlags({flags: app.flags}).join(", ") + ")");
            }
        }
        
        // 9. 探索 ApplicationInfo 的所有静态属性
        logSeparator("ApplicationInfo 所有静态属性");
        console.log("\n静态属性列表:");
        for (var key in ApplicationInfo) {
            try {
                var value = ApplicationInfo[key];
                if (typeof value !== 'function') {
                    console.log("  " + key + " = " + value);
                }
            } catch (e) {
                // 忽略错误
            }
        }
        
    } catch (e) {
        console.log("✗ 获取应用列表失败: " + e.message);
        console.log("  错误堆栈: " + e.stack);
    }
    
    logSeparator("探索完成");
}

// 执行主函数
main();