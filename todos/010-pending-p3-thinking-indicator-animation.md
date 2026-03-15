---
status: pending
priority: p3
issue_id: "010"
tags: [ui, animation, css]
dependencies: []
---

# P3: 思考指示器缺少脉冲动画

## Problem Statement

计划文档明确要求"思考指示器颜色为 `#34d399`，且带有平滑的脉冲动画"，但当前实现只有颜色变化，没有脉冲动画效果。

## Findings

**来源:** performance-oracle 审查报告

**文件位置:** `/Users/chentt/Github/deep-agents-ui/src/app/components/chat/DockToolbar.tsx` 第 82-92 行

**当前代码:**
```typescript
<Button
  variant="ghost"
  size="icon"
  className={cn("h-7 w-7", isThinking ? "text-[#34d399]" : "text-muted-foreground")}
  onClick={toggleThinking}
>
  <Brain className="h-4 w-4" />
  <span className="sr-only">{t("thinking")}</span>
</Button>
```

**问题:** 只有颜色变化，没有脉冲动画。

**计划文档要求:**
> 思考指示器颜色为 `#34d399`，且带有平滑的脉冲动画。

## Proposed Solutions

### 方案 A: 使用 Tailwind animate-pulse（推荐）

**实现:**
```typescript
<Button
  variant="ghost"
  size="icon"
  className={cn(
    "h-7 w-7 transition-colors duration-200",
    isThinking 
      ? "text-[#34d399] animate-pulse"  // ✅ 添加 pulse 动画
      : "text-muted-foreground"
  )}
  onClick={toggleThinking}
>
  <Brain className="h-4 w-4" />
  <span className="sr-only">{t("thinking")}</span>
</Button>
```

**Pros:**
- 简单快速
- 使用 Tailwind 内置动画
- 无需额外 CSS

**Cons:**
- `animate-pulse` 是标准的脉冲效果，可能不够平滑

**Effort:** Small (10 分钟)

**Risk:** 无

---

### 方案 B: 自定义平滑脉冲动画

**实现:**
```css
/* globals.css */
@keyframes thinking-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
}

.thinking-pulse {
  animation: thinking-pulse 1.5s ease-in-out infinite;
}
```

```typescript
<Button
  variant="ghost"
  size="icon"
  className={cn(
    "h-7 w-7 transition-colors duration-200",
    isThinking 
      ? "text-[#34d399] thinking-pulse"  // ✅ 自定义动画
      : "text-muted-foreground"
  )}
  onClick={toggleThinking}
>
  <Brain className="h-4 w-4" />
  <span className="sr-only">{t("thinking")}</span>
</Button>
```

**Pros:**
- 更平滑的动画效果
- 可自定义动画参数
- 更专业的视觉效果

**Cons:**
- 需要添加自定义 CSS
- 增加少量 CSS 代码

**Effort:** Small (20 分钟)

**Risk:** 无

---

### 方案 C: 使用 Framer Motion

**实现:**
```typescript
import { motion } from 'framer-motion';

const MotionButton = motion(Button);

<MotionButton
  variant="ghost"
  size="icon"
  className={cn("h-7 w-7", isThinking ? "text-[#34d399]" : "text-muted-foreground")}
  onClick={toggleThinking}
  animate={isThinking ? { scale: [1, 1.05, 1], opacity: [1, 0.7, 1] } : {}}
  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
>
  <Brain className="h-4 w-4" />
  <span className="sr-only">{t("thinking")}</span>
</MotionButton>
```

**Pros:**
- 最强大的动画控制
- 可组合其他动画
- 如果项目已使用 Framer Motion，一致性好

**Cons:**
- 需要添加新依赖（如果项目未使用）
- 对于简单动画可能过度设计

**Effort:** Medium (1 小时)

**Risk:** 低（如果项目已使用 Framer Motion）

---

## Recommended Action

**推荐方案 A** - 使用 Tailwind `animate-pulse`。这是最简单且符合项目风格的方案。

**实施步骤:**
1. 修改 `DockToolbar.tsx` 添加 `animate-pulse` 类
2. 测试动画效果
3. 如果需要更平滑的动画，升级到方案 B

---

## Acceptance Criteria

- [ ] 添加 `animate-pulse` 类
- [ ] 测试动画在 thinking 开启时播放
- [ ] 测试动画在 thinking 关闭时停止
- [ ] 验证动画不影响性能（FPS 稳定）

---

## Technical Details

**Affected Files:**
- `/Users/chentt/Github/deep-agents-ui/src/app/components/chat/DockToolbar.tsx`

**Related Components:**
- 无

---

## Work Log

### 2026-03-15 - 初始发现

**By:** performance-oracle agent

**Actions:**
- 审查 DockToolbar 的视觉实现
- 发现缺少脉冲动画
- 生成性能审计报告

**Learnings:**
- 计划文档的要求需要完全实现
- 动画可以改善用户反馈

---

## Resources

- Tailwind animate-pulse: https://tailwindcss.com/docs/animation
- 性能审计报告：performance-oracle 审查结果
- 计划文件：`docs/plans/2026-03-15-feat-assistant-config-and-chat-input-toolbar-optimization-plan-deepened.md`
