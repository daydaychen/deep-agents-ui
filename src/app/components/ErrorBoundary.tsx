"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import React, { ErrorInfo, ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  className?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={this.props.className || "p-4 w-full"}>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>组件渲染出错</AlertTitle>
            <AlertDescription className="mt-2 flex flex-col gap-4">
              <p className="text-xs font-mono opacity-80 overflow-auto max-h-32">
                {this.state.error?.message || "未知错误"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="w-fit gap-2 border-destructive/30 hover:bg-destructive/10"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                尝试重置
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
