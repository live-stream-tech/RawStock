import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/query-client";

type DemoModeContextValue = {
  isDemoMode: boolean;
};

const DemoModeContext = createContext<DemoModeContextValue>({ isDemoMode: false });

/** API が空 or 接続不可のとき true。ダミーデータ表示中であることを示す */
export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const { data: videos = [] } = useQuery<any[]>({
    queryKey: ["/api/videos"],
    queryFn: async () => {
      try {
        const url = new URL("/api/videos", getApiUrl());
        const res = await fetch(url.toString(), { credentials: "include" });
        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json) ? json : [];
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });

  const isDemoMode = videos.length === 0;

  return (
    <DemoModeContext.Provider value={{ isDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  return useContext(DemoModeContext);
}
