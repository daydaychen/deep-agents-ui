#!/bin/bash

# 提取完整的对话历史（包括用户和助手）
OUTPUT_DIR="$HOME/Projects/ai-knowledge-base/conversations"
mkdir -p "$OUTPUT_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="$OUTPUT_DIR/conversation_${TIMESTAMP}.json"

echo "📝 正在提取完整对话历史..."

# 使用 osascript 提取对话
temp_output=$(mktemp)

osascript << 'APPLESCRIPT'
 tell application "System Events"
    tell process "Claude"
        set conversationText to ""
        
        -- 获取所有滚动区域中的文本
        repeat with scrollArea in scroll areas of window 1
            try
                set areaText to value of scrollArea as string
                set conversationText to conversationText & "\n---AREA---\n" & areaText
            end try
        end repeat
        
        return conversationText
    end tell
 end tell
APPLESCRIPT

# 如果 AppleScript 失败，使用手动记录模式
cat > "$OUTPUT_FILE" << JSONEOF
{
  "timestamp": "$TIMESTAMP",
  "date": "$(date)",
  "platform": "Claude Desktop",
  "extraction_method": "manual_export",
  "context": "i18n implementation for Next.js project",
  "messages": [
    {
      "role": "system",
      "content": "这是用户和 AI 助手 (Atlas/Orchestrator) 关于 Next.js i18n 实现的对话",
      "timestamp": "$TIMESTAMP"
    }
  ],
  "note": "由于技术限制，无法自动提取对话。建议: 1) 手动复制粘贴对话内容到 memory_items.txt, 2) 或使用截图保存关键信息"
}
JSONEOF

echo "✅ 对话框架已创建: $OUTPUT_FILE"
echo ""
echo "💡 建议操作:"
echo "1. 手动复制对话中的关键信息"
echo "2. 粘贴到 memory_items.txt"
echo "3. 运行 sync_memory.sh 同步到 Databus"
echo ""
