"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

import { type ScreenTheme, readScreenTheme } from "@/components/landing/tour-3d/screen-palette";
import { createScreenFormat } from "@/components/landing/tour-3d/screens/screen-types";
import type { DrawEnv, TourScreensCopy } from "@/components/landing/tour-3d/screens/screen-types";
import type { TourScene } from "@/components/landing/tour-3d/tour-scene";
import type { Locale } from "@/i18n/config";

export type TourEngineStatus = "idle" | "loading" | "ready" | "unsupported";

type Options = {
  stageRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  step: number;
  copy: TourScreensCopy;
  locale: Locale;
  reducedMotion: boolean;
  onSelectStep: (step: number) => void;
};

/**
 * Loads three.js and the 3D scene only when the stage comes near the viewport, keeps the scene in sync
 * with the React state, and frees its GPU memory on unmount. Rendering runs only while the stage is visible.
 */
export function useTourEngine({ stageRef, canvasRef, step, copy, locale, reducedMotion, onSelectStep }: Options) {
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);
  const [result, setResult] = useState<"ready" | "unsupported" | null>(null);
  const sceneRef = useRef<TourScene | null>(null);
  const themeRef = useRef<ScreenTheme | null>(null);
  const focusedStep = useRef(step);
  const latest = useRef({ step, copy, locale, reducedMotion, onSelectStep });

  useEffect(() => {
    latest.current = { step, copy, locale, reducedMotion, onSelectStep };
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof IntersectionObserver === "undefined") return;
    const nearObserver = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setNear(true);
    }, { rootMargin: "400px 0px" });
    const viewObserver = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), {
      threshold: 0.05,
    });
    nearObserver.observe(stage);
    viewObserver.observe(stage);
    return () => {
      nearObserver.disconnect();
      viewObserver.disconnect();
    };
  }, [stageRef]);

  useEffect(() => {
    if (!near) return;
    let cancelled = false;
    (async () => {
      await document.fonts?.ready;
      const { createTourScene } = await import("@/components/landing/tour-3d/tour-scene");
      const stage = stageRef.current;
      const canvas = canvasRef.current;
      if (cancelled || !stage || !canvas) return;
      const now = latest.current;
      const theme = readScreenTheme(document);
      themeRef.current = theme;
      const env: DrawEnv = { theme, copy: now.copy, format: createScreenFormat(now.locale) };
      const scene = createTourScene({
        canvas,
        container: stage,
        env,
        step: now.step,
        reducedMotion: now.reducedMotion,
        onSelectStep: (next) => latest.current.onSelectStep(next),
      });
      if (!scene) {
        setResult("unsupported");
        return;
      }
      focusedStep.current = now.step;
      sceneRef.current = scene;
      setResult("ready");
    })().catch((error: unknown) => {
      if (process.env.NODE_ENV !== "production") console.warn("3D tour could not start", error);
      if (!cancelled) setResult("unsupported");
    });
    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [near, stageRef, canvasRef]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || focusedStep.current === step) return;
    focusedStep.current = step;
    scene.focus(step);
  }, [step, result]);

  useEffect(() => {
    sceneRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion, result]);

  useEffect(() => {
    const theme = themeRef.current;
    if (!theme) return;
    sceneRef.current?.setEnv({ theme, copy, format: createScreenFormat(locale) });
  }, [copy, locale, result]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const update = () => scene.setActive(inView && !document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      scene.setActive(false);
    };
  }, [inView, result]);

  const status: TourEngineStatus = result ?? (near ? "loading" : "idle");
  return { status, inView };
}
