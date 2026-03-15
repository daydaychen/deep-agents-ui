import * as React from "react";
import { Badge } from "@/app/components/ui/Badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_TAGS: string[] = [];

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagInput({
  tags = DEFAULT_TAGS,
  onChange,
  placeholder,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const tagsSet = React.useMemo(() => new Set(tags), [tags]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = inputValue.trim();
      if (val && !tagsSet.has(val)) {
        onChange([...tags, val]);
        setInputValue("");
      }
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div
      className={cn(
        "flex min-h-[36px] w-full flex-wrap gap-1.5 rounded-md border border-input bg-muted/30 px-2 py-1.5 text-xs ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className
      )}
      onClick={() => inputRef.current?.focus()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          inputRef.current?.focus();
        }
      }}
      role="presentation"
    >
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="flex h-5 items-center gap-1 px-2 py-0.5 text-[10px]"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag);
            }}
            className="rounded-full outline-none ring-offset-background hover:bg-muted focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
      <input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-w-[80px] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        placeholder={tags.length === 0 ? placeholder : ""}
      />
    </div>
  );
}
