"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { sceneReady } from "@/lib/scrollState";
import { subscribeFrame } from "@/lib/frameLoop";

export default function Loader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(pathname === "/");
  const [done, setDone] = useState(pathname !== "/");

  useEffect(() => {
    if (pathname !== "/") {
      setDone(true);
      setVisible(false);
      return;
    }

    setVisible(true);
    setDone(false);
    const started = performance.now();
    let hideTimer: number | undefined;

    const unsubscribe = subscribeFrame(() => {
      const elapsed = performance.now() - started;
      if ((sceneReady.ready || sceneReady.failed) && elapsed > 400) {
        setDone(true);
        hideTimer = window.setTimeout(() => setVisible(false), 500);
        unsubscribe();
      }
    });

    return () => {
      unsubscribe();
      window.clearTimeout(hideTimer);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className={`loader${done ? " loader-done" : ""}`} aria-hidden="true">
      <Image src="/icon.svg" alt="" className="loader-logo" width={48} height={48} priority />
    </div>
  );
}
