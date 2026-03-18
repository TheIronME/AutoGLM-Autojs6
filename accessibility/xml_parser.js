/**
 * XML元素解析模块
 * 使用AutoJS6的无障碍服务API获取窗口UI元素信息
 * 类似于droidrun项目的AccessibilityTreeBuilder功能
 */

var logger = require('../utils/logger');

function XmlParser() {
    // 最小元素尺寸阈值(像素)
    this.MIN_ELEMENT_SIZE = 5;
    // 可见性阈值(1%)
    this.VISIBILITY_THRESHOLD = 0.01;
}

/**
 * 获取当前窗口的完整UI元素树
 * @returns {Object|null} UI元素树JSON对象,失败返回null
 */
XmlParser.prototype.getUiTree = function () {
    try {
        // 获取当前窗口的根元素
        var root = auto.rootInActiveWindow();
        
        if (!root) {
            logger.warn("无法获取窗口根元素");
            return null;
        }
        
        // 构建完整的UI树
        var tree = this.buildTree(root, 0);
        
        // 释放根元素资源
        if (root.recycle) {
            root.recycle();
        }
        
        return tree;
        
    } catch (e) {
        logger.error("获取UI树失败: " + e);
        return null;
    }
};

/**
 * 递归构建UI元素树
 * @param {UiObject} node - 当前节点
 * @param {number} depth - 深度
 * @returns {Object} 节点JSON对象
 */
XmlParser.prototype.buildTree = function (node, depth) {
    if (!node) {
        return null;
    }
    
    // 获取边界矩形
    var bounds = node.bounds();
    var boundsInScreen = node.boundsInScreen();
    
    // 几何过滤 - 过滤掉太小的元素
    if (bounds) {
        var width = bounds.width();
        var height = bounds.height();
        if (width < this.MIN_ELEMENT_SIZE || height < this.MIN_ELEMENT_SIZE) {
            return null;
        }
    }
    
    // 提取节点属性
    var nodeData = {
        // 基本标识
        resourceId: node.id(),
        className: node.className(),
        packageName: node.packageName(),
        depth: node.depth(),
        
        // 文本内容 - 优先级: contentDescription > text > 空
        text: node.text() || "",
        contentDescription: node.desc() || "",
        
        // 坐标边界
        boundsInScreen: {
            left: boundsInScreen.left,
            top: boundsInScreen.top,
            right: boundsInScreen.right,
            bottom: boundsInScreen.bottom
        },
        
        // 布尔状态
        clickable: node.clickable(),
        longClickable: node.longClickable(),
        focusable: node.focusable(),
        focused: node.focused(),
        selected: node.selected(),
        checkable: node.checkable(),
        checked: node.checked(),
        enabled: node.enabled(),
        scrollable: node.scrollable(),
        editable: node.editable(),
        visibleToUser: node.visibleToUser(),
        
        // 子节点
        children: []
    };
    
    // 获取子节点
    var childCount = node.childCount();
    if (childCount > 0) {
        for (var i = 0; i < childCount; i++) {
            var child = node.child(i);
            if (child) {
                var childData = this.buildTree(child, depth + 1);
                if (childData) {
                    nodeData.children.push(childData);
                }
                // 释放子节点资源
                if (child.recycle) {
                    child.recycle();
                }
            }
        }
    }
    
    return nodeData;
};

/**
 * 获取简化版的UI元素列表(用于AI理解)
 * 只包含可见的、有内容的元素
 * @returns {Array} 元素列表
 */
XmlParser.prototype.getSimplifiedElements = function () {
    try {
        var root = auto.rootInActiveWindow();
        
        if (!root) {
            logger.warn("无法获取窗口根元素");
            return [];
        }
        
        var elements = [];
        this.extractSimplifiedElements(root, elements, 0);
        
        // 释放根元素资源
        if (root.recycle) {
            root.recycle();
        }
        
        return elements;
        
    } catch (e) {
        logger.error("获取简化元素列表失败: " + e);
        return [];
    }
};

/**
 * 递归提取简化元素
 * @param {UiObject} node - 当前节点
 * @param {Array} elements - 元素列表
 * @param {number} indexCounter - 索引计数器
 */
XmlParser.prototype.extractSimplifiedElements = function (node, elements, indexCounter) {
    if (!node) {
        return;
    }
    
    // 获取边界
    var bounds = node.bounds();
    
    // 几何过滤
    if (bounds) {
        var width = bounds.width();
        var height = bounds.height();
        if (width < this.MIN_ELEMENT_SIZE || height < this.MIN_ELEMENT_SIZE) {
            return;
        }
    }
    
    // 文本提取策略 (优先级: desc > text > className)
    var text = node.text() || "";
    var contentDesc = node.desc() || "";
    var className = node.className() || "";
    var resourceId = node.id() || "";
    
    var displayText = "";
    if (contentDesc) {
        displayText = contentDesc;
    } else if (text) {
        displayText = text;
    } else if (resourceId) {
        // 从resourceId中提取最后一部分
        var parts = resourceId.split('/');
        displayText = parts[parts.length - 1];
    } else if (className) {
        // 使用类名的最后一部分
        var classParts = className.split('.');
        displayText = classParts[classParts.length - 1];
    }
    
    // 元素类型分类
    var elementType = "View";
    if (node.clickable()) {
        elementType = "Clickable";
    } else if (node.checkable()) {
        elementType = "Checkable";
    } else if (node.editable()) {
        elementType = "Input";
    } else if (displayText) {
        elementType = "Text";
    } else if (node.scrollable()) {
        elementType = "Container";
    }
    
    // 只有有内容的元素才添加
    if (displayText || elementType !== "View") {
        var boundsInScreen = node.boundsInScreen();
        elements.push({
            index: indexCounter++,
            type: elementType,
            text: displayText,
            resourceId: resourceId,
            className: className,
            clickable: node.clickable(),
            longClickable: node.longClickable(),
            bounds: {
                left: boundsInScreen.left,
                top: boundsInScreen.top,
                right: boundsInScreen.right,
                bottom: boundsInScreen.bottom
            }
        });
    }
    
    // 递归处理子节点
    var childCount = node.childCount();
    for (var i = 0; i < childCount; i++) {
        var child = node.child(i);
        if (child) {
            this.extractSimplifiedElements(child, elements, indexCounter);
            if (child.recycle) {
                child.recycle();
            }
        }
    }
};

/**
 * 将UI树转换为适合AI理解的文本描述
 * @returns {string} 格式化的UI描述文本
 */
XmlParser.prototype.getUiDescription = function () {
    var elements = this.getSimplifiedElements();
    
    if (!elements || elements.length === 0) {
        return "无法获取UI元素信息";
    }
    
    var description = "屏幕元素列表:\n\n";
    
    for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        var boundsStr = el.bounds ? 
            `[${el.bounds.left}, ${el.bounds.top}, ${el.bounds.right}, ${el.bounds.bottom}]` : "[]";
        
        description += `[${el.index}] ${el.type}: "${el.text}"`;
        
        if (el.resourceId) {
            description += ` (id: ${el.resourceId})`;
        }
        
        description += ` at ${boundsStr}`;
        
        if (el.clickable) {
            description += " [可点击]";
        }
        if (el.longClickable) {
            description += " [可长按]";
        }
        
        description += "\n";
    }
    
    return description;
};

module.exports = new XmlParser();
