import * as React from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Suggestion {
  label: string;
  key: string;
  defaultValue?: string;
}

interface KeyValueFormProps {
  name: string;
  label?: string;
  suggestions?: Suggestion[];
}

export function KeyValueForm({ name, label, suggestions }: KeyValueFormProps) {
  const {
    control,
    register,
  } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  // Check for duplicate keys
  const entries = fields as any[];
  const keys = entries.map((e) => e.key);
  const duplicateKeys = keys.filter(
    (key, index) => key && keys.indexOf(key) !== index
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {label && <label className="text-xs font-semibold">{label}</label>}
      </div>
      
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-1">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion.key}
              type="button"
              variant="secondary"
              size="sm"
              className="h-5 px-2 text-[10px] bg-muted/50 hover:bg-muted text-muted-foreground"
              onClick={() => append({ key: suggestion.key, value: suggestion.defaultValue || "" })}
            >
              + {suggestion.label}
            </Button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {fields.map((field, index) => {
          const isDuplicate =
            (field as any).key && duplicateKeys.includes((field as any).key);
          return (
            <div
              key={field.id}
              className="group flex animate-in fade-in slide-in-from-top-2 duration-200 items-start gap-2"
            >
              <div className="flex-1 space-y-1">
                <Input
                  {...register(`${name}.${index}.key`)}
                  placeholder="Key"
                  className={cn(
                    "h-8 text-xs font-mono",
                    isDuplicate && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                {isDuplicate && (
                  <span className="flex items-center gap-1 text-[10px] text-destructive">
                    <AlertCircle className="h-2.5 w-2.5" />
                    Duplicate key
                  </span>
                )}
              </div>
              <div className="flex-[2]">
                <Input
                  {...register(`${name}.${index}.value`)}
                  placeholder="Value"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ key: "", value: "" })}
        className="h-7 px-2 text-[11px] font-medium"
      >
        <Plus className="mr-1.5 h-3 w-3" />
        Add Entry
      </Button>
    </div>
  );
}
