'use client';

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: undefined });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-6 text-center">
          <div className="max-w-lg rounded-3xl bg-white p-10 shadow-2xl">
            <h2 className="text-2xl font-semibold text-uld-border">
              哦哦，组件出错了
            </h2>
            <p className="mt-4 text-sm text-text-main">
              {this.state.message ??
                "我们在渲染此页面时遇到问题，请稍后重试。"}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-uld-border px-6 py-2 text-sm font-semibold text-white shadow-lg hover:bg-uld-border/90"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

