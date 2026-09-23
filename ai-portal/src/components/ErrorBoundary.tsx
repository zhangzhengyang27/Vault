"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
            <AlertTriangle size={26} />
          </div>
          <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            页面渲染出错
          </h2>
          <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
            {this.state.error?.message || "发生了未知错误，请尝试刷新页面。"}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
            >
              <RefreshCw size={15} /> 重试
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Home size={15} /> 返回首页
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
