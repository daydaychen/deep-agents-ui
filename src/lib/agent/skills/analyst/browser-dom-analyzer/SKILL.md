---
name: browser-dom-analyzer
description: 专家级 DOM 结构分析技能，用于识别 Web 框架、渲染模式、DOM 树结构、动态内容加载机制，为 XPath 生成提供结构化的 DOM 洞察。
---

# Browser DOM Analyzer - DOM 结构分析专家

## 概述

本技能提供专家级 DOM 结构分析能力，识别：
- **Web 框架类型** - React、Vue、Angular、Svelte 等
- **渲染模式** - SSR、CSR、Hybrid、静态 HTML
- **DOM 树结构** - 根元素、容器、列表区域、详情区域
- **动态内容加载** - 懒加载、无限滚动、虚拟滚动、骨架屏
- **Shadow DOM** - 封装边界、穿透策略

## 使用场景

- 分析目标网站的页面结构
- 识别列表容器和数据项模式
- 检测现代 Web 框架特征
- 发现动态内容加载机制
- 为 XPath 生成提供 DOM 洞察

## 核心概念

### DOM 结构层次

```
Page Root
├── Header (导航区域)
├── Main Content (主要内容区)
│   ├── List Container (列表容器)
│   │   ├── List Item 1 (数据项)
│   │   ├── List Item 2
│   │   └── ...
│   └── Pagination (翻页区域)
├── Sidebar (侧边栏)
└── Footer (页脚)
```

### 渲染模式

| 模式 | 特征 | 识别方法 |
|------|------|----------|
| **SSR** | HTML 直接包含数据 | 查看 HTML 源码是否有数据 |
| **CSR** | HTML 为空壳，数据通过 JS 加载 | 网络监听 XHR/Fetch |
| **Hybrid** | 部分 SSR + 部分 CSR | 混合检测 |
| **静态** | 无 JS 或少量 JS | 无动态内容 |

### Web 框架特征

**React 特征**:
- `data-reactroot`, `data-reactid` 属性
- Class 名包含 `__react-` 或随机哈希
- 组件化结构明显

**Vue 特征**:
- `data-v-xxx` 属性
- `__vue__` 全局变量
- 模板编译痕迹

**Angular 特征**:
- `ng-` 前缀属性/类
- `_nghost-xxx`, `_ngcontent-xxx` 属性
- 模块化结构

## 分析流程

### 步骤 1: 页面导航与快照

```python
# 导航到目标页面
browser_navigate(url="https://target-site.com")
browser_wait_for_load_state(state="networkidle")

# 获取页面快照
snapshot = browser_snapshot()
```

### 步骤 2: 框架识别

```python
# 检测框架特征
framework_detection = browser_evaluate("""
    () => {
        const features = {
            react: !!document.querySelector('[data-reactroot]') || 
                   !!window.React || 
                   !!window.ReactDOM,
            vue: !!document.querySelector('[data-v-]') || 
                 !!window.Vue,
            angular: !!document.querySelector('[ng-]') || 
                     !!window.angular,
            jquery: !!window.jQuery,
        };
        
        // 检测构建工具
        features.webpack = !!window.webpackChunk;
        features.vite = !!document.querySelector('script[type="module"]');
        
        return features;
    }
""")
```

### 步骤 3: 渲染模式检测

```python
# 获取初始 HTML
initial_html = browser_get_content()

# 监听网络请求
network_requests = browser_get_network_requests()

# 判断渲染模式
if len(initial_html) > 10000 and has_data_in_html(initial_html):
    rendering_mode = "SSR"
elif len(network_requests) > 0 and has_json_response(network_requests):
    rendering_mode = "CSR"
else:
    rendering_mode = "STATIC"
```

### 步骤 4: DOM 结构分析

```python
# 分析 DOM 树结构
dom_analysis = browser_evaluate("""
    () => {
        const analysis = {
            // 根元素
            root: document.documentElement.tagName,
            
            // 主要容器
            containers: [],
            
            // 列表区域候选
            list_candidates: [],
            
            // 翻页区域候选
            pagination_candidates: [],
            
            // 动态内容区域
            dynamic_regions: []
        };
        
        // 查找主要容器
        const mainContainers = document.querySelectorAll('main, .container, .content, #app, #root');
        mainContainers.forEach(el => {
            analysis.containers.push({
                tag: el.tagName,
                class: el.className,
                id: el.id,
                children: el.children.length,
                xpath: getXPath(el)
            });
        });
        
        // 查找列表区域候选（重复子元素模式）
        const potentialLists = document.querySelectorAll('ul, ol, .list, .items, [role="list"]');
        potentialLists.forEach(el => {
            const children = Array.from(el.children);
            if (children.length >= 3 && hasSimilarStructure(children)) {
                analysis.list_candidates.push({
                    tag: el.tagName,
                    class: el.className,
                    itemCount: children.length,
                    xpath: getXPath(el)
                });
            }
        });
        
        // 查找翻页区域候选
        const paginationKeywords = /下一页 | 上一页|page|pagination|more|加载更多/i;
        const paginationElements = document.querySelectorAll(
            'a:contains("'下一页'"), button:contains("'更多'"), .pagination, .pager, [class*="page"]'
        );
        paginationElements.forEach(el => {
            analysis.pagination_candidates.push({
                tag: el.tagName,
                text: el.textContent.trim(),
                class: el.className,
                xpath: getXPath(el)
            });
        });
        
        return analysis;
    }
    
    // 辅助函数：生成 XPath
    function getXPath(element) {
        if (!element) return null;
        if (element.id) return `//*[@id="${element.id}"]`;
        
        const parts = [];
        let current = element;
        
        while (current && current.nodeType === Node.ELEMENT_NODE) {
            let index = 1;
            let sibling = current.previousElementSibling;
            
            while (sibling) {
                if (sibling.nodeName === current.nodeName) index++;
                sibling = sibling.previousElementSibling;
            }
            
            const tagName = current.nodeName.toLowerCase();
            const className = current.className ? `[@class="${current.className}"]` : '';
            parts.unshift(`${tagName}${className}[${index}]`);
            
            current = current.parentNode;
        }
        
        return '//' + parts.join('/');
    }
    
    // 辅助函数：判断子元素结构是否相似
    function hasSimilarStructure(elements) {
        if (elements.length < 3) return false;
        
        const firstTags = Array.from(elements[0].children).map(el => el.tagName);
        const matchCount = elements.slice(1).filter(el => {
            const tags = Array.from(el.children).map(e => e.tagName);
            return JSON.stringify(tags) === JSON.stringify(firstTags);
        }).length;
        
        return matchCount >= elements.length * 0.8;
    }
""")
```

### 步骤 5: 动态内容检测

```python
# 检测懒加载内容
lazy_load_detection = browser_evaluate("""
    () => {
        const images = document.querySelectorAll('img');
        const lazyImages = Array.from(images).filter(img => 
            img.hasAttribute('loading="lazy"') || 
            img.hasAttribute('data-src') ||
            img.classList.contains('lazy')
        );
        
        const observersExist = 'IntersectionObserver' in window;
        
        return {
            hasLazyImages: lazyImages.length > 0,
            lazyImageCount: lazyImages.length,
            hasIntersectionObserver: observersExist,
            mayHaveInfiniteScroll: observersExist && window.scrollY > 0
        };
    }
""")

# 检测虚拟滚动
virtual_scroll_detection = browser_evaluate("""
    () => {
        const scrollable = document.querySelectorAll('[style*="overflow"], .virtual, [role="listbox"]');
        const hasVirtualScrolling = Array.from(scrollable).some(el => {
            const style = window.getComputedStyle(el);
            return style.overflow === 'auto' || style.overflow === 'scroll';
        });
        
        // 检测常见虚拟滚动库
        return {
            hasVirtualScrolling,
            mayUseReactVirtualized: !!document.querySelector('.ReactVirtualized'),
            mayUseVueVirtualScroll: !!document.querySelector('.vue-virtual-scroll'),
            mayUseWindowing: !!document.querySelector('[role="grid"]')
        };
    }
""")
```

### 步骤 6: Shadow DOM 检测

```python
shadow_dom_detection = browser_evaluate("""
    () => {
        const shadowRoots = [];
        
        document.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) {
                shadowRoots.push({
                    tag: el.tagName,
                    class: el.className,
                    mode: el.shadowRoot.mode,
                    xpath: getXPath(el)
                });
            }
        });
        
        return {
            hasShadowDOM: shadowRoots.length > 0,
            shadowRoots: shadowRoots,
            penetrationStrategy: shadowRoots.length > 0 ? 
                'Use JavaScript to access shadowRoot.content' : 'N/A'
        };
    }
""")
```

## 输出格式

```yaml
dom_analysis_report:
  url: "https://target-site.com"
  
  # 框架识别
  framework:
    detected: "react"  # react, vue, angular, svelte, jquery, vanilla
    confidence: 0.95   # 置信度
    evidence:
      - "Found data-reactroot attribute"
      - "Detected React DevTools hook"
  
  # 渲染模式
  rendering_mode:
    type: "csr"  # ssr, csr, hybrid, static
    confidence: 0.9
    evidence:
      - "Initial HTML is minimal (2KB)"
      - "Detected 5 XHR requests loading data"
  
  # DOM 结构
  dom_structure:
    root_element: "html"
    
    containers:
      - tag: "main"
        class: "main-content"
        xpath: "//main[@class='main-content']"
        children_count: 50
    
    list_regions:
      - container_xpath: "//ul[@class='product-list']"
        item_count: 20
        item_pattern: "//li[@class='product-item']"
        has_consistent_structure: true
    
    pagination_region:
      detected: true
      elements:
        - xpath: "//a[contains(text(), '下一页')]"
          type: "text_link"
        - xpath: "//li[@class='next']//a"
          type: "class_based"
  
  # 动态内容
  dynamic_content:
    lazy_loading:
      detected: true
      type: "image"  # image, content, infinite_scroll
      trigger: "intersection_observer"
    
    virtual_scrolling:
      detected: false
    
    skeleton_screen:
      detected: true
      pattern: "div.skeleton-loader"
  
  # Shadow DOM
  shadow_dom:
    detected: false
    elements: []
  
  # 技术建议
  technical_recommendations:
    xpath_generation:
      - "Use stable class names: .product-item"
      - "Avoid dynamic indices"
      - "Prefer data-* attributes if available"
    
    dynamic_content_handling:
      - "Wait for IntersectionObserver to trigger"
      - "Scroll down to load more content"
      - "Wait for skeleton screen to disappear"
```

## 决策流程

```
开始分析
    ↓
导航到页面
    ↓
获取页面快照
    ↓
检测 Web 框架 ────→ 记录框架特征
    ↓
检测渲染模式 ────→ SSR: HTML 包含数据
    │               CSR: XHR 加载数据
    │               Hybrid: 混合模式
    ↓
分析 DOM 结构 ────→ 识别容器、列表、翻页
    ↓
检测动态内容 ────→ 懒加载、虚拟滚动、骨架屏
    ↓
检测 Shadow DOM ──→ 封装边界
    ↓
生成分析报告
```

## 常见问题

### Q1: 如何区分 SSR 和 CSR？

**A**: 检查初始 HTML 内容量 + 网络请求：
- SSR: HTML > 10KB，数据直接在 HTML 中
- CSR: HTML < 5KB，数据通过 XHR 加载

### Q2: 如何处理 Shadow DOM？

**A**: 使用 JavaScript 穿透：
```python
# 访问 Shadow DOM 内部内容
content = browser_evaluate("""
    () => {
        const host = document.querySelector('x-component');
        return host.shadowRoot.querySelector('.target').textContent;
    }
""")
```

### Q3: 如何检测无限滚动？

**A**: 检测 IntersectionObserver + 滚动监听：
```python
has_infinite_scroll = browser_evaluate("""
    () => {
        return 'IntersectionObserver' in window && 
               window.onscroll !== null;
    }
""")
```

## 最佳实践

### 1. 优先使用稳定选择器

```python
# ✅ 好的选择器 - 稳定语义化
"//nav[contains(@class, 'main-nav')]"
"//button[@data-testid='submit']"

# ❌ 坏的选择器 - 动态生成
"//div[@class='css-1a2b3c']"
"//div[@id='comp-abc123']"
```

### 2. 检测 data-* 属性

```python
data_attrs = browser_evaluate("""
    () => {
        const elements = document.querySelectorAll('[data-testid], [data-role], [data-id]');
        return Array.from(elements).map(el => ({
            tag: el.tagName,
            dataAttrs: Array.from(el.attributes)
                .filter(attr => attr.name.startsWith('data-'))
                .map(attr => attr.name)
        }));
    }
""")
```

### 3. 等待动态内容

```python
# 等待骨架屏消失
browser_wait_for_function("""
    () => !document.querySelector('.skeleton-loader')
""", timeout=10000)

# 等待列表加载完成
browser_wait_for_function("""
    () => document.querySelectorAll('.product-item').length > 0
""", timeout=10000)
```

## 相关 Skills

- [`element-extractor`](../element-extractor/SKILL.md) - 基于 DOM 分析生成 XPath
- [`network-request-analyzer`](../network-request-analyzer/SKILL.md) - 网络请求分析
- [`xpath-validator`](../xpath-validator/SKILL.md) - XPath 验证专家
