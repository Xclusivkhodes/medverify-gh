"use client";

import {
  makeSimulatedAlert,
  type CabinetPack,
  type FamilyMember,
  type Relation,
  type StockLine,
} from "@/lib/cabinet/logic";
import { normBatch, normName } from "@/lib/text";
import { useSyncExternalStore } from "react";

const KEY = "mv-cabinet-v1";
const EVENT = "mv-cabinet";

export interface CabinetData {
  version: 1;
  members: FamilyMember[];
  packs: CabinetPack[];
  stock: StockLine[];
}

export function emptyCabinet(): CabinetData {
  return {
    version: 1,
    members: [{ id: "you", name: "You", relation: "self" }],
    packs: [],
    stock: [],
  };
}

export function parseCabinet(raw: string): CabinetData {
  if (!raw) return emptyCabinet();
  try {
    const value = JSON.parse(raw) as Partial<CabinetData>;
    if (!value || value.version !== 1 || !Array.isArray(value.members) || !Array.isArray(value.packs)) return emptyCabinet();
    const members = value.members.filter((member) => member && member.id && member.name).slice(0, 8);
    return {
      version: 1,
      members: members.length ? members : emptyCabinet().members,
      packs: value.packs.filter((pack) => pack && pack.id && pack.productName).slice(0, 40),
      stock: Array.isArray(value.stock) ? value.stock.filter((line) => line && line.id).slice(0, 20) : [],
    };
  } catch {
    return emptyCabinet();
  }
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
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY) ?? "";
}

export function useCabinet(): CabinetData {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  return parseCabinet(raw);
}

function write(next: CabinetData) {
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

function mutate(change: (current: CabinetData) => CabinetData) {
  write(change(parseCabinet(readRaw())));
}

function uid(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Date.now().toString(36);
  return `${prefix}-${random}`;
}

export function savePack(input: Omit<CabinetPack, "id" | "savedAt" | "lastCheckedAt" | "simulatedAlert">): void {
  const now = new Date().toISOString();
  mutate((current) => {
    const memberId = current.members.some((member) => member.id === input.memberId) ? input.memberId : current.members[0].id;
    const index = current.packs.findIndex(
      (pack) =>
        pack.memberId === memberId &&
        normBatch(pack.batch) === normBatch(input.batch) &&
        normName(pack.productName) === normName(input.productName),
    );
    if (index >= 0) {
      const existing = current.packs[index];
      const packs = current.packs.slice();
      packs[index] = { ...existing, ...input, memberId, id: existing.id, savedAt: existing.savedAt, lastCheckedAt: now, simulatedAlert: existing.simulatedAlert };
      return { ...current, packs };
    }
    const pack: CabinetPack = {
      ...input,
      memberId,
      id: uid("pack"),
      savedAt: now,
      lastCheckedAt: now,
      simulatedAlert: null,
    };
    return { ...current, packs: [pack, ...current.packs].slice(0, 40) };
  });
}

export function simulatePackAlert(id: string): void {
  mutate((current) => ({
    ...current,
    packs: current.packs.map((pack) =>
      pack.id === id ? { ...pack, simulatedAlert: makeSimulatedAlert(pack), lastCheckedAt: new Date().toISOString() } : pack,
    ),
  }));
}

export function clearPackAlert(id: string): void {
  mutate((current) => ({
    ...current,
    packs: current.packs.map((pack) => (pack.id === id ? { ...pack, simulatedAlert: null, lastCheckedAt: new Date().toISOString() } : pack)),
  }));
}

export function updatePack(id: string, patch: Partial<Pick<CabinetPack, "memberId" | "expiryReminder" | "labelReminder">>): void {
  mutate((current) => ({
    ...current,
    packs: current.packs.map((pack) => (pack.id === id ? { ...pack, ...patch } : pack)),
  }));
}

export function removePack(id: string): void {
  mutate((current) => ({ ...current, packs: current.packs.filter((pack) => pack.id !== id) }));
}

export function touchRecheck(): void {
  const now = new Date().toISOString();
  mutate((current) => ({ ...current, packs: current.packs.map((pack) => ({ ...pack, lastCheckedAt: now })) }));
}

export function addMember(name: string, relation: Relation): void {
  const clean = name.replace(/\s+/g, " ").trim().slice(0, 40);
  if (!clean) return;
  mutate((current) => {
    if (current.members.length >= 8) return current;
    return { ...current, members: [...current.members, { id: uid("who"), name: clean, relation }] };
  });
}

export function removeMember(id: string): void {
  mutate((current) => {
    if (id === "you" || current.members.length <= 1) return current;
    return {
      ...current,
      members: current.members.filter((member) => member.id !== id),
      packs: current.packs.map((pack) => (pack.memberId === id ? { ...pack, memberId: "you" } : pack)),
    };
  });
}

export function logStock(input: Omit<StockLine, "id" | "verifiedOn"> & { verifiedOn?: string }): void {
  const line: StockLine = {
    ...input,
    id: uid("stock"),
    verifiedOn: input.verifiedOn ?? new Date().toISOString(),
  };
  mutate((current) => ({ ...current, stock: [line, ...current.stock].slice(0, 20) }));
}

export function removeStock(id: string): void {
  mutate((current) => ({ ...current, stock: current.stock.filter((line) => line.id !== id) }));
}
