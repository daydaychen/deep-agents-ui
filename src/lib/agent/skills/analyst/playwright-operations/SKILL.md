---
name: playwright-operations
description: Playwright MCP 操作指南，用于网站结构分析、元素定位、交互操作等
---

# Playwright 操作指南

## 概述

本 Skill 提供 Playwright MCP 工具的使用指南，帮助进行网站结构分析和元素定位。

## 常用操作

### 页面导航

```python
# 访问页面
playwright.navigate(url="https://example.com")

# 等待页面加载
playwright.wait_for_load_state(state="networkidle")
```

### 元素定位

```python
# 获取页面快照
playwright.snapshot()

# 点击元素
playwright.click(selector="button.submit")

# 输入文本
playwright.fill(selector="input[name='search']", value="keyword")
```

### 内容提取

```python
# 获取 HTML 内容
html = playwright.get_content()

# 截图
playwright.screenshot(path="screenshot.png")
```

## 分析工作流

### 步骤 1: 访问目标页面

```python
playwright.navigate(url=target_url)
playwright.wait_for_load_state(state="domcontentloaded")
```

### 步骤 2: 获取页面结构

```python
snapshot = playwright.snapshot()
# 分析 DOM 结构，识别列表容器和数据字段
```

### 步骤 3: 验证 XPath

```python
# 在浏览器控制台测试 XPath
elements = page.query_selector_all("xpath=//div[@class='item']")
```

## 最佳实践

- 使用 `networkidle` 等待动态内容加载
- 优先使用唯一选择器避免歧义
- 截图保存关键页面状态便于调试

## 常见问题

| 问题 | 原因 | 解决方案 |
|-----|------|----------|
| 元素不可见 | 页面未完全加载 | 增加等待时间 |
| 选择器失效 | 动态类名变化 | 使用稳定属性定位 |
| 交互被拦截 | 弹窗或遮罩 | 先处理弹窗 |
