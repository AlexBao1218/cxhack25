'use client';

import React from "react";
import { Toaster } from "react-hot-toast";

import ErrorBoundary from "@/components/ErrorBoundary";

interface ProvidersProps {
  children: React.ReactNode;
}

const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      {children}
      <Toaster position="top-right" />
    </ErrorBoundary>
  );
};

export default Providers;

