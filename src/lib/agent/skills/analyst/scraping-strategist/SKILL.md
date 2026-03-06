---
name: scraping-strategist
description: 综合采集策略制定专家，基于 DOM 分析、网络请求分析、XPath/JSONPath 验证结果，制定最优采集策略，决策数据源类型、采集技术选型、翻页策略，输出完整的 YAML 采集配置和 Hook 代码建议。
---

# Scraping Strategist - 采集策略架构师

## 概述

本技能提供综合采集策略制定能力：
- **数据源决策** - 决策使用 API 还是 HTML 解析
- **技术选型** - 选择 requests 或 new_render 采集器
- **翻页策略** - 制定翻页配置方案
- **配置生成** - 输出完整的 YAML 采集配置
- **Hook 建议** - 为动态参数生成提供 Hook 代码建议
- **风险评估** - 识别采集难度和技术障碍

## 核心原则

### 1. API 优先

**优先级顺序**：
```
1. ✅ 公开 API（无需鉴权） - 最优
2. ✅ 鉴权 API（可获取 Token） - 良好
3. ⚠️ HTML 解析（静态内容） - 可接受
4. ⚠️ HTML 解析（动态渲染） - 需要浏览器
5. ❌ 高难度反爬 - 建议放弃或特殊处理
```

### 2. 实证主义

**所有决策基于实际探测结果**：
```python
# 基于实际数据做决策
if has_api_with_json_response:
    strategy = "api_based"
elif has_stable_html_structure:
    strategy = "html_based"
else:
    strategy = "not_recommended"
```

### 3. 完整配置

**输出可直接使用的 YAML 配置**：
```yaml
scraping_strategy:
  crawl_path:
    type: "list_to_detail"
    pages:
      - name: "list_page"
        request_config: {...}
        extract_config: {...}
        pagination: {...}
```

## 策略决策流程

### 步骤 1: 数据源评估

```python
def evaluate_data_source(dom_analysis, network_analysis):
    """
    评估数据源类型
    
    Returns:
        dict: 数据源评估报告
    """
    evaluation = {
        'recommended_source': None,
        'confidence': 0,
        'reasons': [],
        'alternatives': []
    }
    
    # 检查是否有 API
    if network_analysis.get('has_data_api'):
        api_info = network_analysis.get('api_info', {})
        
        # 公开 API（最优）
        if not api_info.get('requires_auth', True):
            evaluation['recommended_source'] = 'api'
            evaluation['confidence'] = 0.95
            evaluation['reasons'].append("检测到公开 API，无需鉴权")
            evaluation['reasons'].append("API 响应为 JSON 格式，易于解析")
            evaluation['reasons'].append("采集效率高，不需要渲染 HTML")
        
        # 鉴权 API（良好）
        elif can_obtain_auth(api_info):
            evaluation['recommended_source'] = 'api'
            evaluation['confidence'] = 0.85
            evaluation['reasons'].append("检测到 API，需要鉴权")
            evaluation['reasons'].append("鉴权参数可从页面或 Cookie 获取")
            evaluation['alternatives'].append('html_based')
        
        # 复杂鉴权 API（谨慎）
        elif api_info.get('complex_encryption'):
            evaluation['recommended_source'] = 'api'
            evaluation['confidence'] = 0.60
            evaluation['reasons'].append("检测到 API，但有复杂加密")
            evaluation['reasons'].append("需要逆向 JS 获取签名逻辑")
            evaluation['alternatives'].append('html_based')
    
    # 检查 HTML 结构
    if dom_analysis.get('has_stable_structure'):
        if evaluation['recommended_source'] is None:
            evaluation['recommended_source'] = 'html'
            evaluation['confidence'] = 0.75
            evaluation['reasons'].append("HTML 结构稳定，适合 XPath 提取")
            evaluation['reasons'].append("检测到语义化 class 和稳定 ID")
        
        # 动态渲染 HTML
        if dom_analysis.get('rendering_mode') == 'csr':
            evaluation['confidence'] = 0.65
            evaluation['reasons'].append("客户端渲染，需要使用 new_render 采集器")
    
    # 评估替代方案
    if evaluation['recommended_source'] == 'api':
        evaluation['alternatives'].append('html_based')
    elif evaluation['recommended_source'] == 'html':
        evaluation['alternatives'].append('api_based_if_available')
    
    return evaluation
```

### 步骤 2: 采集器选型

```python
def select_downloader_type(strategy_info):
    """
    选择采集器类型
    
    Returns:
        str: "requests" 或 "new_render"
    """
    # 使用 API → requests 采集器
    if strategy_info['data_source'] == 'api':
        return 'requests'
    
    # 静态 HTML → requests 采集器
    if strategy_info.get('rendering_mode') == 'ssr':
        return 'requests'
    
    # 动态渲染 → new_render 采集器
    if strategy_info.get('rendering_mode') in ['csr', 'hybrid']:
        return 'new_render'
    
    # 默认使用 requests
    return 'requests'
```

### 步骤 3: 翻页策略制定

```python
def create_pagination_strategy(network_analysis, dom_analysis):
    """
    制定翻页策略
    
    Returns:
        dict: 翻页配置
    """
    pagination = {
        'type': None,
        'config': {}
    }
    
    # API 翻页（config 类型）
    if network_analysis.get('has_data_api'):
        api_params = network_analysis.get('api_params', {})
        
        # URL 参数翻页
        if 'page' in api_params or 'offset' in api_params:
            pagination['type'] = 'config'
            pagination['config'] = create_config_pagination(api_params)
        
        # Cursor 翻页
        elif 'cursor' in api_params:
            pagination['type'] = 'config'
            pagination['config'] = create_cursor_pagination(api_params)
        
        # POST 请求体翻页
        elif network_analysis.get('method') == 'POST':
            pagination['type'] = 'config'
            pagination['config'] = create_post_body_pagination(api_params)
    
    # HTML 翻页（xpath 类型）
    elif dom_analysis.get('has_pagination'):
        pagination['type'] = 'xpath'
        pagination['config'] = create_xpath_pagination(dom_analysis)
    
    return pagination


def create_config_pagination(api_params):
    """
    创建 URL 参数翻页配置
    """
    page_param = 'page' if 'page' in api_params else 'offset'
    
    return {
        'status': True,
        'type': 'config',
        'total': {
            'ref': "{{ resp_content.jsonpath('$.total')[0] }}",
            'default': 100
        },
        'step': 1 if page_param == 'page' else api_params.get('size', 20),
        'current': {
            'from': f"{{{{ requests_data.params.{page_param} }}}}",
            'to': [
                {
                    'value': f"$.params.{page_param}",
                    'format': {
                        'type': 'add_value',
                        'value': 1 if page_param == 'page' else api_params.get('size', 20)
                    }
                }
            ]
        }
    }
```

### 步骤 4: 生成完整配置

```python
def generate_complete_config(analysis_results):
    """
    生成完整的 YAML 采集配置
    
    Args:
        analysis_results: 综合分析结果
    
    Returns:
        dict: 完整的采集配置
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
                'type': analysis_results.get('crawl_type', 'list_to_detail'),
                'pages': []
            }
        },
        'technical_recommendations': {
            'downloader_type': analysis_results['downloader_type'],
            'notes': analysis_results.get('recommendations', [])
        }
    }
    
    # 添加列表页配置
    list_page = create_list_page_config(analysis_results)
    config['scraping_strategy']['crawl_path']['pages'].append(list_page)
    
    # 如果需要详情页，添加详情页配置
    if analysis_results.get('has_detail_page'):
        detail_page = create_detail_page_config(analysis_results)
        config['scraping_strategy']['crawl_path']['pages'].append(detail_page)
    
    return config


def create_list_page_config(analysis_results):
    """
    创建列表页配置
    """
    page_config = {
        'name': 'list_page',
        'description': analysis_results.get('page_description', '列表页'),
    }
    
    # API 数据源
    if analysis_results['data_source'] == 'api':
        page_config['request_config'] = {
            'url': analysis_results['api_url'],
            'method': analysis_results.get('api_method', 'GET'),
            'headers': analysis_results.get('api_headers', {}),
            'params': analysis_results.get('api_params', {})
        }
        
        page_config['extract_config'] = {
            'contain_path': analysis_results['list_jsonpath'],
            'fields': analysis_results['field_jsonpaths']
        }
        
        page_config['pagination'] = analysis_results['pagination_config']
    
    # HTML 数据源
    else:
        page_config['request_config'] = {
            'url': analysis_results['url'],
            'method': 'GET'
        }
        
        page_config['extract_config'] = {
            'contain_path': analysis_results['list_xpath'],
            'fields': analysis_results['field_xpaths']
        }
        
        page_config['pagination'] = analysis_results['pagination_config']
    
    return page_config
```

## 风险评估

```python
def assess_risks(analysis_results):
    """
    评估采集风险
    
    Returns:
        dict: 风险评估报告
    """
    risks = {
        'level': 'low',  # low, medium, high, critical
        'factors': [],
        'recommendations': []
    }
    
    # 检查登录要求
    if analysis_results.get('requires_login'):
        risks['level'] = 'medium'
        risks['factors'].append('需要登录才能访问数据')
        risks['recommendations'].append('配置 Cookie 或实现登录流程')
    
    # 检查反爬措施
    if analysis_results.get('has_anti_scraping'):
        risks['level'] = 'high'
        risks['factors'].append('检测到反爬措施')
        
        if analysis_results.get('has_captcha'):
            risks['factors'].append('存在验证码')
            risks['recommendations'].append('考虑使用打码平台或人工介入')
        
        if analysis_results.get('has_ip_limit'):
            risks['factors'].append('存在 IP 限制')
            risks['recommendations'].append('使用代理 IP 池')
        
        if analysis_results.get('has_rate_limit'):
            risks['factors'].append('存在频率限制')
            risks['recommendations'].append('降低采集频率，添加随机延迟')
    
    # 检查加密复杂度
    if analysis_results.get('encryption_complexity') == 'high':
        risks['level'] = 'high'
        risks['factors'].append('API 参数加密复杂')
        risks['recommendations'].append('需要深度逆向 JS 源码')
    
    # 检查结构稳定性
    if analysis_results.get('structure_stability') == 'low':
        risks['level'] = 'medium'
        risks['factors'].append('页面结构可能频繁变化')
        risks['recommendations'].append('使用更稳定的选择器，定期验证')
    
    # 综合评估
    if risks['level'] == 'critical' or len(risks['factors']) >= 3:
        risks['recommendations'].append('建议重新评估采集可行性')
    
    return risks
```

## 输出格式

```yaml
# 完整的采集策略配置
analysis_report:
  target_url: "https://target-site.com/products"
  data_source_type: "api"  # api 或 html
  rendering_mode: "csr"    # ssr, csr, hybrid
  verification_status: "completed"
  
  # 导航路径（如果需要从首页导航）
  navigation_required: false

scraping_strategy:
  crawl_path:
    type: "list_to_detail"  # list_to_detail, single_page, api_direct
    
    pages:
      - name: "list_page"
        description: "商品列表页"
        
        # API 请求配置
        request_config:
          url: "https://api.target-site.com/v1/products"
          method: "GET"
          headers:
            Authorization: "Bearer token_here"
            Content-Type: "application/json"
            X-Request-Id: "uuid-1234"
          params:
            page: 1
            size: 20
            category: "electronics"
        
        extract_config:
          # 列表抽取容器路径
          contain_path: "$.data.items[*]"
          
          # 字段配置
          fields:
            - name: "id"
              jsonpath: "$.data.items[*].id"
              extract_type: "number"
            
            - name: "title"
              jsonpath: "$.data.items[*].title"
              extract_type: "text"
            
            - name: "price"
              jsonpath: "$.data.items[*].price"
              extract_type: "number"
            
            - name: "url"
              jsonpath: "$.data.items[*].detailUrl"
              extract_type: "url"
        
        # 翻页配置
        pagination:
          type: "config"
          page_path:
            status: true
            type: "config"
            total:
              ref: "{{ resp_content.jsonpath('$.data.total')[0] }}"
              default: 100
            step: 1
            current:
              from: "{{ requests_data.params.page }}"
              to:
                - value: "$.params.page"
                  format:
                    type: "add_value"
                    value: 1
      
      - name: "detail_page"
        description: "商品详情页"
        url: "${url}"  # 使用 list_page 的 url 字段
        
        request_config:
          url: "${url}"
          method: "GET"
        
        extract_config:
          fields:
            - name: "description"
              xpath: "//div[@class='description']/text()"
              extract_type: "text"
            
            - name: "images"
              xpath: "//div[@class='gallery']//img/@src"
              extract_type: "image"
        
        pagination:
          page_path:
            status: false

technical_recommendations:
  downloader_type: "requests"  # requests 或 new_render

  notes: |
    1. 数据通过 API 加载，优先使用 API 采集
    2. 需要处理签名验证，建议使用 js-reverse-engineer skill 逆向
    3. 翻页通过 page 参数控制，步长为 1
    4. 详情页 URL 在 API 响应中直接提供

  risks:
    level: "medium"
    factors:
      - "API 需要鉴权"
      - "存在签名验证"
    recommendations:
      - "配置有效的 Authorization Token"
      - "实现签名生成逻辑"

  # Hook 配置建议（当检测到动态参数时）
  hook_recommendations:
    required: true
    type: "before_request"
    description: "需要动态生成签名参数"
    code: |
      def before_request(request, context):
          import hashlib
          import time
          
          # 生成时间戳
          request.params['timestamp'] = int(time.time() * 1000)
          
          # 生成签名
          secret = context.get('secret_key', 'your_secret')
          sign_params = {k: v for k, v in request.params.items() if k != 'sign'}
          sign_string = '&'.join(f'{k}={v}' for k, v in sorted(sign_params.items()))
          request.params['sign'] = hashlib.md5((sign_string + secret).encode()).hexdigest()
```

## 常见问题

### Q1: API 和 HTML 都可以用，选哪个？

**A**: 优先选择 API：
- API 更稳定（接口变更频率低）
- API 更高效（不需要解析 HTML）
- API 数据更完整（可能包含 HTML 未显示的数据）

### Q2: 如何判断是否需要 new_render 采集器？

**A**: 
- SSR/静态 HTML → requests
- CSR（客户端渲染）→ new_render
- 混合渲染 → 根据数据源决定

### Q3: 翻页配置中的 step 如何设置？

**A**:
- page 参数（page=1,2,3）→ step=1
- offset 参数（offset=0,20,40）→ step=page_size
- cursor 参数 → 从上页响应获取

## 最佳实践

### 1. 完整记录 Headers

```yaml
headers:
  # 鉴权相关（必须完整记录）
  Authorization: "Bearer token"
  Cookie: "session=xxx"
  
  # 签名相关（必须完整记录）
  X-Signature: "signature_value"
  X-Timestamp: "1704326400"
  
  # 标准 Headers（按需记录）
  Content-Type: "application/json"
  User-Agent: "Mozilla/5.0..."
```

### 2. 使用模板变量

```yaml
# list_page 抽取的字段可以在 detail_page 中使用
pages:
  - name: "list_page"
    extract_config:
      fields:
        - name: "detail_url"
          jsonpath: "$.detailUrl"
  
  - name: "detail_page"
    url: "${detail_url}"  # 使用 list_page 的字段
```

### 3. 验证所有路径

```python
# 在输出配置前验证所有路径
def validate_all_paths(config):
    for page in config['pages']:
        for field in page['extract_config']['fields']:
            if 'jsonpath' in field:
                assert validate_jsonpath(field['jsonpath'])
            elif 'xpath' in field:
                assert validate_xpath(field['xpath'])
```

## 相关 Skills

- [`browser-dom-analyzer`](../browser-dom-analyzer/SKILL.md) - DOM 结构分析
- [`network-request-analyzer`](../network-request-analyzer/SKILL.md) - 网络请求分析
- [`xpath-validator`](../xpath-validator/SKILL.md) - XPath 验证专家
- [`jsonpath-validator`](../jsonpath-validator/SKILL.md) - JSONPath 验证专家
