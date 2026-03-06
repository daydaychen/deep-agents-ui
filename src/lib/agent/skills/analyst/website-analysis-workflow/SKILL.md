---
name: website-analysis-workflow
description: 全自动网站分析工作流，协调多个专家 skills 完成从 URL 到采集配置的完整分析流程，包括 DOM 分析、API 识别、路径生成、验证和配置输出。
---

# Website Analysis Workflow - 全自动网站分析流程

## 概述

本技能提供**全自动模式**的网站分析能力，协调多个专家 skills 完成完整分析流程：

```
用户输入 URL
    ↓
[1] browser-dom-analyzer → DOM 结构分析
    ↓
[2] network-request-analyzer → API 识别分析
    ↓
[3] 数据源决策 → 选择 API 或 HTML 路径
    ↓
[4a] element-extractor → XPath 生成 (HTML 路径)
[4b] network-request-analyzer → JSONPath 生成 (API 路径)
    ↓
[5] xpath-validator / jsonpath-validator → 路径验证
    ↓
[6] js-reverse-engineer → 动态参数逆向 (如有需要)
    ↓
[7] scraping-strategist → 生成完整配置
    ↓
输出 YAML 配置 + Hook 代码建议
```

## 使用场景

配置人员输入目标 URL，期望自动获得：
- 完整的采集策略配置
- 数据源类型决策（API/HTML）
- 稳定的 XPath/JSONPath
- Hook 代码建议（动态参数）

## 全自动流程

### 步骤 1: 网站可访问性检查

```python
def check_website_accessibility(url):
    """
    检查网站是否可访问
    """
    try:
        browser_navigate(url=url)
        browser_wait_for_load_state(state="domcontentloaded")
        return {
            'accessible': True,
            'url': url
        }
    except Exception as e:
        return {
            'accessible': False,
            'error': str(e),
            'escalation': {
                'type': 'WEBSITE_UNREACHABLE',
                'url': url,
                'suggestion': '请检查 URL 是否正确，或确认目标网站是否可正常访问'
            }
        }
```

**失败处理**：
```
<escalation>
type: WEBSITE_UNREACHABLE
url: {target_url}
error: {具体错误信息}
suggestion: 请检查 URL 是否正确，或确认目标网站是否可正常访问
</escalation>
```

### 步骤 2: DOM 结构分析

```python
def analyze_dom_structure(url):
    """
    调用 browser-dom-analyzer 分析 DOM 结构
    """
    # 使用 browser-dom-analyzer skill
    dom_report = {
        'framework': detect_framework(),
        'rendering_mode': detect_rendering_mode(),
        'containers': find_containers(),
        'list_regions': find_list_regions(),
        'pagination_candidates': find_pagination(),
        'dynamic_content': detect_dynamic_content()
    }
    return dom_report
```

### 步骤 3: 网络请求分析

```python
def analyze_network_requests():
    """
    调用 network-request-analyzer 分析网络请求
    """
    # 监听网络请求
    requests = browser_get_network_requests()
    
    # 识别数据 API
    data_api = identify_data_api(requests)
    
    # 获取 API 响应
    if data_api:
        response = browser_get_network_response(data_api['request_id'])
        json_data = json.loads(response['body'])
        
        return {
            'has_api': True,
            'api_url': data_api['url'],
            'api_method': data_api['method'],
            'api_headers': data_api['headers'],
            'api_params': data_api['params'],
            'json_data': json_data,
            'dynamic_params': identify_dynamic_params(data_api)
        }
    else:
        return {
            'has_api': False
        }
```

### 步骤 4: 数据源决策

```python
def decide_data_source(dom_report, network_report):
    """
    决策使用 API 还是 HTML
    """
    if network_report.get('has_api'):
        # 检查 API 是否返回有效数据
        json_data = network_report.get('json_data', {})
        if has_valid_data_list(json_data):
            return {
                'source': 'api',
                'confidence': 0.95,
                'reason': '检测到返回 JSON 数据的 API 接口'
            }
    
    # 检查 HTML 结构是否稳定
    if dom_report.get('has_stable_structure'):
        return {
            'source': 'html',
            'confidence': 0.75,
            'reason': 'HTML 结构稳定，适合 XPath 提取'
        }
    
    return {
        'source': 'unknown',
        'confidence': 0.5,
        'reason': '无法确定合适的数据源',
        'escalation': 'NEED_MANUAL_ANALYSIS'
    }
```

### 步骤 5: 路径生成与验证

#### API 路径

```python
def generate_and_validate_jsonpaths(json_data):
    """
    生成并验证 JSONPath
    """
    # 分析 JSON 结构
    structure = analyze_json_structure(json_data)
    list_path = structure['suggested_list_path']
    
    # 生成字段 JSONPath
    fields = generate_jsonpaths(json_data, list_path)
    
    # 验证每个 JSONPath
    validated_fields = []
    for field_name, field_info in fields.items():
        result = validate_jsonpath(json_data, field_info['jsonpath'])
        if result['status'] == 'passed':
            validated_fields.append({
                'name': field_name,
                'jsonpath': field_info['jsonpath'],
                'extract_type': field_info['extract_type'],
                'verified': True
            })
        else:
            # 验证失败，尝试替代方案
            alt_jsonpath = suggest_alternative_jsonpath(field_info['jsonpath'])
            alt_result = validate_jsonpath(json_data, alt_jsonpath)
            if alt_result['status'] == 'passed':
                validated_fields.append({
                    'name': field_name,
                    'jsonpath': alt_jsonpath,
                    'extract_type': field_info['extract_type'],
                    'verified': True
                })
    
    return {
        'list_path': list_path,
        'fields': validated_fields,
        'all_verified': len(validated_fields) == len(fields)
    }
```

#### HTML 路径

```python
def generate_and_validate_xpaths(dom_report):
    """
    生成并验证 XPath
    """
    list_region = dom_report['list_regions'][0]  # 使用第一个列表区域
    container_xpath = list_region['xpath']
    
    # 生成列表项 XPath
    item_xpath = f"{container_xpath}/{list_region['item_tag']}"
    
    # 验证列表项 XPath
    items = browser_get_elements_by_xpath(xpath=item_xpath)
    if len(items) < 1:
        return {'error': '列表项 XPath 验证失败'}
    
    # 生成字段 XPath
    fields = []
    for field_type in ['title', 'url', 'image', 'price']:
        xpath = generate_field_xpath(field_type, container_xpath)
        result = validate_xpath(xpath)
        if result['status'] == 'passed':
            fields.append({
                'name': field_type,
                'xpath': xpath,
                'verified': True
            })
    
    return {
        'container_xpath': container_xpath,
        'item_xpath': item_xpath,
        'fields': fields,
        'all_verified': True
    }
```

### 步骤 6: 动态参数逆向

```python
def reverse_engineer_dynamic_params(network_report):
    """
    调用 js-reverse-engineer 逆向动态参数
    """
    if not network_report.get('dynamic_params'):
        return None
    
    dynamic_params = network_report['dynamic_params']
    
    # 分析每个动态参数
    param_analysis = []
    for param in dynamic_params:
        if param['type'] == 'timestamp':
            param_analysis.append({
                'name': param['name'],
                'type': 'timestamp',
                'hook_code': generate_timestamp_hook(param)
            })
        elif param['type'] in ['md5_signature', 'sha256_signature', 'hmac']:
            # 需要逆向 JS
            js_analysis = analyze_js_for_signature(param)
            param_analysis.append({
                'name': param['name'],
                'type': param['type'],
                'js_source': js_analysis.get('source'),
                'hook_code': generate_signature_hook(js_analysis)
            })
    
    return param_analysis
```

### 步骤 7: 生成完整配置

```python
def generate_complete_config(analysis_results):
    """
    调用 scraping-strategist 生成完整配置
    """
    config = {
        'analysis_report': {
            'target_url': analysis_results['url'],
            'data_source_type': analysis_results['data_source'],
            'rendering_mode': analysis_results.get('rendering_mode', 'ssr'),
            'verification_status': 'completed'
        },
        'scraping_strategy': {
            'crawl_path': {
                'type': 'list_to_detail',
                'pages': []
            }
        },
        'technical_recommendations': {
            'downloader_type': analysis_results['downloader_type'],
            'hook_recommendations': analysis_results.get('hook_code')
        }
    }
    
    # 添加列表页配置
    list_page = create_list_page_config(analysis_results)
    config['scraping_strategy']['crawl_path']['pages'].append(list_page)
    
    return config
```

## 输出格式

```yaml
# 完整分析报告
analysis_report:
  target_url: "https://target-site.com/products"
  data_source_type: "api"
  rendering_mode: "csr"
  verification_status: "completed"

scraping_strategy:
  crawl_path:
    type: "list_to_detail"
    pages:
      - name: "list_page"
        request_config:
          url: "https://api.target-site.com/v1/products"
          method: "GET"
          headers:
            Authorization: "Bearer token"
          params:
            page: 1
            size: 20
        extract_config:
          contain_path: "$.data.items[*]"
          fields:
            - name: "id"
              jsonpath: "$.data.items[*].id"
            - name: "title"
              jsonpath: "$.data.items[*].title"
        pagination:
          type: "config"

technical_recommendations:
  downloader_type: "requests"
  hook_recommendations:
    required: true
    type: "before_request"
    code: |
      def before_request(request, context):
          import hashlib
          request.params['sign'] = hashlib.md5(
              (request.url + str(int(time.time()))).encode()
          ).hexdigest()
```

## 错误处理

### 网站不可访问

```
<escalation>
type: WEBSITE_UNREACHABLE
url: https://target-site.com
error: 连接超时
suggestion: 请检查 URL 是否正确，或确认目标网站是否可正常访问
</escalation>
```

### 需要登录

```
<escalation>
type: NEED_LOGIN
url: https://target-site.com
error: 检测到登录提示或 401 未授权响应
suggestion: 请先登录网站，然后提供 Cookie 或 Authorization Token
</escalation>
```

### 反爬措施

```
<escalation>
type: ANTI_SCRAPING
url: https://target-site.com
error: 检测到验证码或 IP 封禁
suggestion: 建议使用代理 IP 或联系平台管理员
</escalation>
```

### 复杂加密

```
<escalation>
type: COMPLEX_ENCRYPTION
url: https://target-site.com
error: API 参数使用复杂加密，无法自动逆向
suggestion: 需要人工逆向 JS 源码分析加密逻辑
</escalation>
```

## 相关 Skills

本工作流协调以下专家 skills：

- [`browser-dom-analyzer`](../browser-dom-analyzer/SKILL.md) - DOM 结构分析
- [`network-request-analyzer`](../network-request-analyzer/SKILL.md) - 网络请求分析
- [`element-extractor`](../element-extractor/SKILL.md) - XPath 生成
- [`xpath-validator`](../xpath-validator/SKILL.md) - XPath 验证
- [`jsonpath-validator`](../jsonpath-validator/SKILL.md) - JSONPath 验证
- [`js-reverse-engineer`](../js-reverse-engineer/SKILL.md) - JS 逆向
- [`scraping-strategist`](../scraping-strategist/SKILL.md) - 配置生成
