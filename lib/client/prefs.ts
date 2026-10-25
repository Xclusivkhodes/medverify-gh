"use client";

import { useSyncExternalStore } from "react";

const KEY = "mv-low-data";
const EVENT = "mv-low-data";

function subscribe(onChange: () => void) {
  const notify = () => onChange();
  window.addEventListener(EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}

function read(): string {
  if (typeof window === "undefined") return "0";
  return window.localStorage.getItem(KEY) === "1" ? "1" : "0";
}

export function useLowData(): boolean {
  return useSyncExternalStore(subscribe, read, () => "0") === "1";
}

export function setLowData(on: boolean): void {
  window.localStorage.setItem(KEY, on ? "1" : "0");
  window.dispatchEvent(new Event(EVENT));
}
