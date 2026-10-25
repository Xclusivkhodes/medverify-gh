"use client";

import { isRegion, type GhanaRegion } from "@/lib/cabinet/regions";
import { useSyncExternalStore } from "react";

const KEY = "mv-reports-v1";
const EVENT = "mv-reports";

export interface RegionReport {
  id: string;
  region: GhanaRegion;
  note: string;
  createdAt: string;
}

function subscribe(onChange: () => void) {
  const notify = () => onChange();
  window.addEventListener(EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}

function readRaw(): string {
  if (typeof window === "undefined") return "[]";
  return window.localStorage.getItem(KEY) ?? "[]";
}

export function parseReports(raw: string): RegionReport[] {
  try {
    const value = JSON.parse(raw) as RegionReport[];
    if (!Array.isArray(value)) return [];
    return value
      .filter((item) => item && isRegion(item.region) && typeof item.note === "string" && item.id)
      .slice(0, 50);
  } catch {
    return [];
  }
}

export function useReports(): RegionReport[] {
  return parseReports(useSyncExternalStore(subscribe, readRaw, () => "[]"));
}

export function addReport(region: GhanaRegion, note: string): void {
  const clean = note.replace(/\s+/g, " ").replace(/(?:\+?\d[\d\s().-]{5,}\d)/g, "").trim().slice(0, 140);
  const current = parseReports(readRaw());
  const next: RegionReport = {
    id: globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Date.now().toString(36),
    region,
    note: clean || "Suspicious pack reported in this region.",
    createdAt: new Date().toISOString(),
  };
  window.localStorage.setItem(KEY, JSON.stringify([next, ...current].slice(0, 50)));
  window.dispatchEvent(new Event(EVENT));
}
