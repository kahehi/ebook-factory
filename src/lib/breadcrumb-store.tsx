"use client";

import { createContext, useContext, useState } from "react";

interface BreadcrumbContextValue {
  projectTitle: string | null;
  setProjectTitle: (title: string | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  projectTitle: null,
  setProjectTitle: () => {},
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [projectTitle, setProjectTitle] = useState<string | null>(null);
  return (
    <BreadcrumbContext.Provider value={{ projectTitle, setProjectTitle }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export const useBreadcrumb = () => useContext(BreadcrumbContext);
