"use client";

import { PRODUCT } from "@/lib/brand";
import { ArrowLeft, Moon, Sun } from "@phosphor-icons/react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

type Lang = "en" | "tw";

function currentTheme(): "light" | "dark" {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function previewingTheme(): boolean {
  const value = new URLSearchParams(window.location.search).get("theme");
  return value === "light" || value === "dark";
}

export function Shell({
  children,
  wide = false,
  back,
  title,
}: {
  children: ReactNode;
  wide?: boolean;
  back?: { label: string; onClick: () => void };
  title?: string;
}) {
  const [lang, setLang] = useState<Lang>("en");

  function toggleTheme() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    if (!previewingTheme()) window.localStorage.setItem("mv-theme", next);
  }

  return (
    <div className={wide ? "shell-wide" : "app"}>
      <a className="skip" href="#content">Skip to content</a>
      <header className="topbar">
        {back ? (
          <button type="button" className="btn btn-icon btn-plain" aria-label={back.label} onClick={back.onClick}>
            <ArrowLeft className="icon" aria-hidden="true" />
          </button>
        ) : (
          <Link href="/" className="inline-flex items-center min-h-tap" aria-label={`${PRODUCT.name} home`}>
            <Lockup />
          </Link>
        )}
        {title ? <p className="topbar-title">{title}</p> : wide ? <DesktopNav /> : null}
        <div className="topbar-actions">
          <div className="lang" role="group" aria-label="Language">
            <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
            <button type="button" className="from-desk" aria-pressed={lang === "tw"} lang="tw" onClick={() => setLang("tw")}>Twi</button>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-icon theme-toggle"
            aria-label="Change light or dark mode"
            onClick={toggleTheme}
          >
            <Moon className="icon-sm i-moon" aria-hidden="true" />
            <Sun className="icon-sm i-sun" aria-hidden="true" />
          </button>
        </div>
      </header>
      {lang === "tw" ? (
        <div className="gutter" style={{ paddingBottom: 8 }}>
          <div className="note" role="status">
            <div>
              <strong lang="tw">{PRODUCT.taglineTwi}</strong>
              <p>Twi copy is a placeholder and needs a native speaker. The check itself stays in English.</p>
            </div>
          </div>
        </div>
      ) : null}
      <div id="content">{children}</div>
    </div>
  );
}

function Lockup() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PRODUCT.logoLight} alt="" width={165} height={28} className="only-light lockup" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PRODUCT.logoDark} alt="" width={165} height={28} className="only-dark lockup" />
      <span className="sr-only">{PRODUCT.name}</span>
    </>
  );
}

function DesktopNav() {
  return (
    <nav className="from-desk flex items-center gap-1" aria-label="Main">
      <Link className="btn btn-plain text-text" href="/how-it-works">How it works</Link>
      <Link className="btn btn-plain text-text" href="/cabinet">Cabinet</Link>
      <Link className="btn btn-plain text-text" href="/pharmacist">Pharmacist</Link>
      <Link className="btn btn-plain text-text" href="/digest">Digest</Link>
    </nav>
  );
}
