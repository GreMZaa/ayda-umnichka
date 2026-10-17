"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Agentation } from "agentation";

function AgentationInner() {
  const searchParams = useSearchParams();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const param = searchParams.get("agentation");
    if (param === "1") {
      sessionStorage.setItem("agentation_active", "1");
      setEnabled(true);
    } else if (param === "0") {
      sessionStorage.removeItem("agentation_active");
      setEnabled(false);
    } else if (sessionStorage.getItem("agentation_active") === "1") {
      setEnabled(true);
    }
  }, [searchParams]);

  if (!enabled) return null;

  return (
    <Agentation
      endpoint="http://localhost:4747"
      appName="АйДаУмничка"
    />
  );
}

export default function AgentationClient() {
  return (
    <Suspense fallback={null}>
      <AgentationInner />
    </Suspense>
  );
}
