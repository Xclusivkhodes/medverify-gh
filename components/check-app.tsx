"use client";

import { CheckDetails } from "@/components/check-details";
import { CitedText } from "@/components/cited-text";
import { Shell } from "@/components/shell";
import { SiteFooter } from "@/components/site-footer";
import { CONTACTS, PRODUCT, footerDisclaimer, type Presentation } from "@/lib/brand";
import { apiUrl } from "@/lib/client/api";
import { decodeBarcode } from "@/lib/client/barcode";
import { logStock, useCabinet } from "@/lib/client/cabinet-store";
import { clearPendingPhoto, loadPendingPhoto, photoQuality, savePendingPhoto, shrinkImage } from "@/lib/client/media";
import { offlineMedicineResult } from "@/lib/client/offline-check";
import { setLowData, useLowData } from "@/lib/client/prefs";
import { streamCheck } from "@/lib/client/stream";
import { MODEL_DEFAULTS, modelShortName } from "@/lib/models";
import { TRY_EXAMPLES, getScenario } from "@/lib/modes/medicine/scenarios";
import type { LabelFields, MedicineResult } from "@/lib/modes/medicine/types";
import type { TraceStep } from "@/lib/modes/types";
import {
  ArrowClockwise,
  ArrowRight,
  ArrowSquareOut,
  Barcode,
  CalendarX,
  Camera,
  CaretRight,
  Check,
  CheckCircle,
  CircleNotch,
  ClipboardText,
  Clock,
  Drop,
  Eyedropper,
  FileMagnifyingGlass,
  FileText,
  GlobeSimple,
  Info,
  Keyboard,
  Lightbulb,
  ListChecks,
  LockSimple,
  MagnifyingGlass,
  PencilSimple,
  Phone,
  Pill,
  Prohibit,
  Question,
  Scales,
  Scan,
  SealWarning,
  Siren,
  UploadSimple,
  Warning,
  WarningOctagon,
  WhatsappLogo,
  WifiSlash,
  X,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";

type View = "home" | "capture" | "checking" | "result" | "evidence";
type Tab = "photo" | "upload" | "type";
type Quality = "ok" | "blurry" | "dark";

const EMPTY: LabelFields = {
  productName: "",
  manufacturer: "",
  batch: "",
  expiry: "",
  registrationNumber: "",
  otherText: "",
};

const STAGE_ORDER = [
  { id: "vision", title: "Read the pack", Icon: Scan },
  { id: "normalize", title: "Check the label", Icon: FileText },
  { id: "evidence", title: "Searching FDA alerts", Icon: MagnifyingGlass },
  { id: "verdict", title: "Match your batch", Icon: Scales },
] as const;

type Status = {
  ok?: boolean;
  mode?: "demo" | "live";
  llm?: "ok" | "paused" | "breaker_open";
};

type RunInput = {
  fields: LabelFields;
  scenarioId: string | null;
  imageDataUrl: string | null;
  gs1Raw?: string | null;
  scratchReply?: string | null;
};

export function CheckApp() {
  const [status, setStatus] = useState<Status | null>(null);
  const [view, setView] = useState<View>("home");
  const [tab, setTab] = useState<Tab>("photo");
  const [fields, setFields] = useState<LabelFields>(EMPTY);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState<Quality>("ok");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [hint, setHint] = useState("Show the batch number and the expiry");
  const [online, setOnline] = useState(true);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [stages, setStages] = useState<TraceStep[]>([]);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<MedicineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [lastInput, setLastInput] = useState<RunInput | null>(null);
  const [gs1Raw, setGs1Raw] = useState("");
  const [scratchReply, setScratchReply] = useState("");
  const [deskName, setDeskName] = useState("");
  const [deskBatch, setDeskBatch] = useState("");
  const [heroName, setHeroName] = useState("");
  const [heroBatch, setHeroBatch] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cabinet = useCabinet();
  const lowData = useLowData();
  const logged = cabinet.stock.length > 0;
  const rows: BatchRow[] = logged
    ? cabinet.stock.map((line) => ({
        name: line.productName,
        detail: `Verified on ${new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Accra", day: "numeric", month: "short", year: "numeric" }).format(new Date(line.verifiedOn))}`,
        batch: line.batch,
        presentation: line.presentation,
        source: line.source,
        href: line.href,
      }))
    : EXAMPLE_ROWS;

  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl("/api/status"), { signal: controller.signal })
      .then((response) => response.json())
      .then((data: Status) => setStatus(data))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (!online || !offlineSaved) return;
    let cancel = false;
    void (async () => {
      const photo = await loadPendingPhoto();
      if (cancel || !photo) return;
      setImageDataUrl(photo);
      setOfflineSaved(false);
      await clearPendingPhoto();
      await run({ fields: EMPTY, imageDataUrl: photo, scenarioId: null });
    })();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  useEffect(() => {
    if (view !== "checking") return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [view]);

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream && view === "capture" && tab === "photo") {
      video.srcObject = stream;
      void video.play().catch(() => undefined);
    }
  }, [view, tab, cameraOn]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  function resetToHome() {
    stopCamera();
    setView("home");
    setResult(null);
    setError(null);
    setCanRetry(false);
    setStages([]);
    setQuality("ok");
  }

  async function openCamera() {
    setError(null);
    setCanRetry(false);
    setScenarioId(null);
    setView("capture");
    setQuality("ok");
    if (lowData) {
      setTab("type");
      setHint("Low-data mode is on. Type the batch instead of sending a photo.");
      return;
    }
    setTab("photo");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraDenied(true);
      setTab("upload");
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      setCameraOn(true);
      setCameraDenied(false);
      setHint("Line up the batch number and hold still");
    } catch {
      setCameraDenied(true);
      setCameraOn(false);
      setTab("upload");
      setHint("Camera is off. Upload a photo or type the label.");
    }
  }

  async function acceptDataUrl(dataUrl: string) {
    const grade = await photoQuality(dataUrl);
    setQuality(grade);
    setImageDataUrl(grade === "ok" ? dataUrl : dataUrl);
    setScenarioId(null);
    setHint(grade === "dark" ? "Add light" : grade === "blurry" ? "Move closer" : "Batch found · hold still");
    if (grade === "ok") {
      const code = await decodeBarcode(dataUrl);
      if (code) {
        setGs1Raw(code);
        setHint("Barcode read on this phone. We’ll compare it with the printed batch.");
      }
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setCanRetry(false);
    if (!file.type.startsWith("image/")) {
      setError("Choose a JPEG, PNG, or WebP photo of the label.");
      return;
    }
    if (file.size > 5_000_000) {
      setError("That photo is over 5 MB. Crop it closer to the label.");
      return;
    }
    try {
      const dataUrl = await shrinkImage(file);
      await acceptDataUrl(dataUrl);
      setView("capture");
      setTab("upload");
    } catch {
      setError("That photo could not be read. Try JPEG or PNG, or type the label.");
    }
  }

  async function shutter() {
    const video = videoRef.current;
    if (!video?.videoWidth) {
      await openCamera();
      return;
    }
    const canvas = document.createElement("canvas");
    const max = 1024;
    const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    await acceptDataUrl(canvas.toDataURL("image/jpeg", 0.82));
    stopCamera();
  }

  function selectExample(id: string) {
    const scenario = getScenario(id);
    if (!scenario) return;
    stopCamera();
    setScenarioId(id);
    setFields(scenario.fields);
    setGs1Raw(scenario.gs1Raw ?? "");
    setScratchReply("");
    setImageDataUrl(null);
    setQuality("ok");
    setError(null);
    setCanRetry(false);
    setResult(null);
    setView("capture");
    setTab("type");
    setHint("Example label. It is not a photo of a real pack.");
  }

  async function run(input: RunInput) {
    setError(null);
    setCanRetry(false);
    setLastInput(input);
    setStages([]);
    setResult(null);
    setStartedAt(Date.now());
    setNow(Date.now());
    setView("checking");
    try {
      const payload = await streamCheck(
        {
          mode: "medicine",
          scenarioId: input.scenarioId ?? undefined,
          forceDemo: Boolean(input.scenarioId) || status?.mode !== "live",
          productName: input.fields.productName,
          manufacturer: input.fields.manufacturer,
          batch: input.fields.batch,
          expiry: input.fields.expiry,
          registrationNumber: input.fields.registrationNumber,
          otherText: input.fields.otherText,
          imageDataUrl: input.scenarioId || lowData ? undefined : input.imageDataUrl ?? undefined,
          gs1Raw: input.gs1Raw || undefined,
          scratchReply: input.scratchReply || undefined,
        },
        (step) => setStages((current) => [...current.filter((item) => item.id !== step.id), step]),
      );
      setResult(payload);
      setView("result");
    } catch (caught) {
      if (!navigator.onLine) {
        if (input.imageDataUrl) {
          await savePendingPhoto(input.imageDataUrl);
          setOfflineSaved(true);
        }
        setView("capture");
        return;
      }
      setError(caught instanceof Error ? caught.message : "The check failed.");
      setCanRetry(true);
      setView("capture");
    }
  }

  async function onSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (quality !== "ok") return;
    if (!scenarioId && !imageDataUrl && !fields.productName && !fields.batch) {
      setError("Add a photo, or type at least the product name or the batch number.");
      setCanRetry(false);
      return;
    }
    if (tab === "type" && !scenarioId && !fields.productName.trim()) {
      setError("Type the product name. The batch can wait if you cannot read it.");
      setCanRetry(false);
      return;
    }
    if (!navigator.onLine) {
      if (imageDataUrl) {
        await savePendingPhoto(imageDataUrl);
        setOfflineSaved(true);
      }
      if (scenarioId || fields.productName || fields.batch) {
        setResult(
          offlineMedicineResult({
            mode: "medicine",
            scenarioId: scenarioId ?? undefined,
            productName: fields.productName,
            manufacturer: fields.manufacturer,
            batch: fields.batch,
            expiry: fields.expiry,
            registrationNumber: fields.registrationNumber,
            otherText: fields.otherText,
            gs1Raw: gs1Raw || undefined,
            scratchReply: scratchReply || undefined,
          }),
        );
        setView("result");
      }
      return;
    }
    await run({ fields, scenarioId, imageDataUrl: quality === "ok" ? imageDataUrl : null, gs1Raw, scratchReply });
  }

  async function addDeskRow(event: FormEvent) {
    event.preventDefault();
    if (!deskName.trim()) {
      setError("Type a product name to check a batch.");
      return;
    }
    if (rows.length >= 20) return;
    const name = deskName.trim();
    const batch = deskBatch.trim();
    setDeskName("");
    setDeskBatch("");
    try {
      const payload = await streamCheck(
        { mode: "medicine", forceDemo: status?.mode !== "live", productName: name, batch },
        () => undefined,
      );
      logStock({
        productName: name,
        batch: batch || "not read",
        expiry: "",
        presentation: payload.outcome === "search_failed" ? "unsure" : payload.presentation,
        source: payload.evidence.find((item) => item.role === "match")?.title ?? "No FDA notice in the snapshot",
        href: payload.evidence.find((item) => item.role === "match")?.url,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That batch could not be checked.");
    }
  }

  function heroCheck(event: FormEvent) {
    event.preventDefault();
    const name = heroName.trim();
    const batch = heroBatch.trim().toUpperCase();
    if (!name && !batch) {
      setError("Type a product name or a batch number.");
      setView("capture");
      setTab("type");
      return;
    }
    const next = { ...EMPTY, productName: name, batch };
    setFields(next);
    setScenarioId(null);
    setImageDataUrl(null);
    void run({ fields: next, scenarioId: null, imageDataUrl: null, gs1Raw, scratchReply });
  }

  const scenario = getScenario(scenarioId ?? undefined);
  const elapsed = startedAt ? Math.max(0, now - startedAt) : 0;
  const slow = view === "checking" && elapsed > 8000;
  const doneIds = new Set(stages.map((step) => step.id));
  const activeId = STAGE_ORDER.find((step) => !doneIds.has(step.id))?.id;

  const back =
    view === "home"
      ? undefined
      : {
          label: view === "checking" ? "Cancel and go back" : view === "result" ? "Close and check another" : "Back",
          onClick: () => {
            if (view === "evidence") setView("result");
            else if (view === "result") resetToHome();
            else {
              stopCamera();
              setView(result ? "result" : "home");
            }
          },
        };

  return (
    <Shell wide={view === "home"} back={back} title={view === "home" ? undefined : titleFor(view)}>
      {view === "home" ? (
        <Home
          onCamera={() => void openCamera()}
          onUpload={() => {
            setView("capture");
            setTab("upload");
            fileRef.current?.click();
          }}
          onType={() => {
            setScenarioId(null);
            setFields(EMPTY);
            setView("capture");
            setTab("type");
          }}
          onExample={selectExample}
          onFile={(file) => void onFile(file)}
          heroName={heroName}
          heroBatch={heroBatch}
          setHeroName={setHeroName}
          setHeroBatch={setHeroBatch}
          onHero={heroCheck}
          deskName={deskName}
          deskBatch={deskBatch}
          setDeskName={setDeskName}
          setDeskBatch={setDeskBatch}
          onDesk={addDeskRow}
          rows={rows}
          logged={logged}
          lowData={lowData}
          onLowData={setLowData}
          fileRef={fileRef}
        />
      ) : null}

      {view === "capture" ? (
        <Capture
          tab={tab}
          setTab={setTab}
          fields={fields}
          setFields={(next) => {
            setScenarioId(null);
            setFields(next);
          }}
          example={Boolean(scenario)}
          imageDataUrl={imageDataUrl}
          quality={quality}
          hint={hint}
          cameraDenied={cameraDenied}
          cameraOn={cameraOn}
          online={online}
          offlineSaved={offlineSaved}
          error={error}
          canRetry={canRetry}
          gs1Raw={gs1Raw}
          setGs1Raw={setGs1Raw}
          scratchReply={scratchReply}
          setScratchReply={setScratchReply}
          lowData={lowData}
          preview={cameraOn && tab === "photo" && !imageDataUrl ? (
            <video ref={videoRef} className="shot" playsInline muted aria-label="Live camera" />
          ) : null}
          onShutter={() => void shutter()}
          onOpenCamera={() => void openCamera()}
          onChoose={() => fileRef.current?.click()}
          onSubmit={(event) => void onSubmit(event)}
          onRetry={() => {
            if (lastInput) void run(lastInput);
          }}
          onRetake={() => {
            setQuality("ok");
            setImageDataUrl(null);
            void openCamera();
          }}
          onTypeInstead={() => {
            setQuality("ok");
            setTab("type");
          }}
        />
      ) : null}

      {view === "checking" ? (
        <Checking
          stages={stages}
          activeId={activeId}
          elapsed={elapsed}
          slow={slow}
          fields={fields}
          example={Boolean(scenario)}
        />
      ) : null}

      {view === "result" && result ? (
        <ResultView
          result={result}
          example={Boolean(scenarioId)}
          onEvidence={() => setView("evidence")}
          onFix={() => {
            setFields(result.fields);
            setScenarioId(null);
            setTab("type");
            setView("capture");
          }}
          onAgain={resetToHome}
          onRetry={() => void run({ fields, scenarioId, imageDataUrl, gs1Raw, scratchReply })}
        />
      ) : null}

      {view === "evidence" && result ? <Evidence result={result} /> : null}

      <input
        ref={fileRef}
        className="sr-only"
        type="file"
        accept="image/*"
        aria-label="Upload a photo of the medicine pack"
        onChange={(event) => void onFile(event.target.files?.[0])}
      />
    </Shell>
  );
}

function titleFor(view: View): string {
  if (view === "capture") return "Check a medicine";
  if (view === "checking") return "Checking";
  if (view === "evidence") return "How we checked";
  return "Your answer";
}

function Home(props: {
  onCamera: () => void;
  onUpload: () => void;
  onType: () => void;
  onExample: (id: string) => void;
  onFile: (file: File) => void;
  heroName: string;
  heroBatch: string;
  setHeroName: (value: string) => void;
  setHeroBatch: (value: string) => void;
  onHero: (event: FormEvent) => void;
  deskName: string;
  deskBatch: string;
  setDeskName: (value: string) => void;
  setDeskBatch: (value: string) => void;
  onDesk: (event: FormEvent) => void;
  rows: BatchRow[];
  logged: boolean;
  lowData: boolean;
  onLowData: (on: boolean) => void;
  fileRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <main>
      <div className="phone-only">
        <section className="gutter pt-8">
          <p className="t-eyebrow">FDA Ghana · WHO alerts</p>
          <h1 className="t-display mt-3">Check a medicine before you take it.</h1>
          <p className="t-lead mt-4">
            Type the name and batch number from the pack. We compare them with public safety alerts.
          </p>
        </section>
        <section className="gutter mt-6" aria-labelledby="check-h">
          <h2 id="check-h" className="sr-only">Check a medicine</h2>
          <form className="card stack" onSubmit={props.onHero}>
            <div className="field">
              <label className="field-label" htmlFor="home-name">Medicine name</label>
              <input id="home-name" className="input" placeholder="Para Clear 125 Suspension" value={props.heroName} onChange={(event) => props.setHeroName(event.target.value)} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="home-batch">
                Batch number <span className="opt">On the box, near “LOT” or “B.No”</span>
              </label>
              <input id="home-batch" className="input input--code" placeholder="L220008" autoCapitalize="characters" autoCorrect="off" spellCheck={false} value={props.heroBatch} onChange={(event) => props.setHeroBatch(event.target.value.toUpperCase())} />
            </div>
            <button className="btn btn-primary btn-lg btn-block" type="submit">Check medicine</button>
            <button type="button" className="btn btn-outline btn-lg btn-block" onClick={props.onCamera}>
              <Camera className="icon-sm" aria-hidden="true" /> Photograph the pack
            </button>
          </form>
          <p className="mt-4">
            <label className="flex items-center gap-2 t-small">
              <input type="checkbox" checked={props.lowData} onChange={(event) => props.onLowData(event.target.checked)} />
              Low-data mode. Type the label. Don’t upload a photo.
            </label>
          </p>
        </section>
        <Examples onExample={props.onExample} />
        <section className="gutter mt-8" aria-labelledby="steps-h">
          <h2 id="steps-h" className="t-h3">Three steps. No sign-up.</h2>
          <ol className="todo mt-3">
            <li><b>Read the pack</b><span>Name, batch and expiry — or a photo.</span></li>
            <li><b>We check public alerts</b><span>FDA Ghana and WHO notices. Not a guess.</span></li>
            <li><b>You get a cited answer</b><span>Do not use, check first, or no alerts found.</span></li>
          </ol>
        </section>
        <Sos />
      </div>

      <div className="from-desk">
        <section className="max-w-content mx-auto px-desk hero-grid" style={{ paddingTop: 64, paddingBottom: 80 }}>
          <div>
            <p className="t-eyebrow">FDA Ghana · WHO alerts</p>
            <h1 className="t-display hero-title mt-4">Check a medicine before you take it.</h1>
            <p className="t-lead mt-6 max-w-38">
              Type the name and batch number from the pack. We compare them with public safety alerts.
            </p>
            <div className="card p-6 mt-10 max-w-600">
              <div
                className="dropzone p-5 flex items-center gap-4"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files?.[0];
                  if (file) props.onFile(file);
                }}
              >
                <span className="w-12 h-12 rounded-full bg-primary-soft text-on-primary-soft grid place-items-center flex-none">
                  <UploadSimple className="icon" aria-hidden="true" />
                </span>
                <div className="flex-1">
                  <p className="t-label">Drop a photo of the pack</p>
                  <p className="t-small t-muted">Or press <kbd>Ctrl</kbd> + <kbd>V</kbd>. Batch and expiry in view.</p>
                </div>
                <button type="button" className="btn btn-outline" onClick={() => props.fileRef.current?.click()}>
                  Choose file
                </button>
              </div>
              <form className="flex items-end gap-3 mt-5" onSubmit={props.onHero}>
                <div className="flex-1">
                  <label htmlFor="hero-name" className="field-label">Or type the name</label>
                  <input id="hero-name" className="input" placeholder="e.g. Para Clear 125" value={props.heroName} onChange={(event) => props.setHeroName(event.target.value)} />
                </div>
                <div style={{ width: 150 }}>
                  <label htmlFor="hero-batch" className="field-label">Batch</label>
                  <input id="hero-batch" className="input t-mono" placeholder="L220008" autoCapitalize="characters" autoCorrect="off" spellCheck={false} value={props.heroBatch} onChange={(event) => props.setHeroBatch(event.target.value.toUpperCase())} />
                </div>
                <button className="btn btn-primary" type="submit" style={{ minHeight: 52 }}>
                  Check <ArrowRight className="icon-sm" aria-hidden="true" />
                </button>
              </form>
              <Examples onExample={props.onExample} headingId="ex-desk" />
            </div>
          </div>
          <div className="grid gap-4" aria-label="Example of an answer">
            <article className="verdict verdict--scam">
              <div className="verdict-strip">
                <WarningOctagon className="icon-sm" weight="bold" aria-hidden="true" />
                Do not use
                <span className="when">Checked just now</span>
              </div>
              <div className="verdict-body">
                <p className="verdict-lead">This batch has an FDA Ghana recall.</p>
                <dl className="kv">
                  <dt>Medicine</dt><dd>Para Clear 125 Suspension</dd>
                  <dt>Batch</dt><dd className="t-mono">L220008</dd>
                  <dt>Alert</dt><dd>Recall — failed quality test</dd>
                </dl>
              </div>
            </article>
          </div>
        </section>
      </div>
      <div className="band">
        <WatchPitch />
        <How />
        <Who />
      </div>
      <section id="pharm" className="from-desk border-t">
          <div className="max-w-content mx-auto px-desk pharm-grid" style={{ paddingTop: 64, paddingBottom: 64 }}>
            <div>
              <p className="t-eyebrow">For pharmacists</p>
              <h2 className="t-h1 mt-2">Check before you dispense.</h2>
              <p className="t-muted mt-3">
                Check up to 20 batches. Each answer links an FDA Ghana notice when we have one. The first starter row is a real alert. The other two are illustrations, not checks.
              </p>
              <form onSubmit={props.onDesk} className="grid gap-4 mt-6">
                <div>
                  <label className="field-label" htmlFor="desk-name">Product name</label>
                  <input id="desk-name" className="input" value={props.deskName} onChange={(event) => props.setDeskName(event.target.value)} placeholder="e.g. Para Clear 125" />
                </div>
                <div>
                  <label className="field-label" htmlFor="desk-batch">Batch</label>
                  <input id="desk-batch" className="input t-mono" value={props.deskBatch} autoCapitalize="characters" autoCorrect="off" spellCheck={false} onChange={(event) => props.setDeskBatch(event.target.value.toUpperCase())} placeholder="L220008" />
                </div>
                <button className="btn btn-primary" type="submit" disabled={props.logged && props.rows.length >= 20}>
                  Check this batch
                </button>
                {props.logged && props.rows.length >= 20 ? <p className="t-small t-muted">This log holds 20 batches. Remove one on the pharmacist page.</p> : null}
              </form>
            </div>
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b">
                <p className="t-label">{props.logged ? "Verified-on log" : "Batch check"}</p>
                {props.logged ? <Link href="/pharmacist" className="t-small font-semibold">Open the log</Link> : <span className="tag-example">EXAMPLE DATA</span>}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <caption className="sr-only">{props.logged ? "Batches checked on this phone, with the time of each check." : "Example batches. Only Para Clear is a real FDA alert."}</caption>
                  <thead>
                    <tr><th>Product</th><th>Batch</th><th>Result</th><th>Source</th></tr>
                  </thead>
                  <tbody>
                    {props.rows.map((row) => (
                      <tr key={`${row.name}-${row.batch}`}>
                        <td>
                          <strong>{row.name}</strong>
                          <br />
                          <span className="t-small t-muted">{row.detail}</span>
                        </td>
                        <td className="t-mono">{row.batch}</td>
                        <td><VerdictChip presentation={row.presentation} /></td>
                        <td>
                          {row.href ? <a href={row.href} className="font-semibold">{row.source}</a> : <span className="t-small t-muted">{row.source}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
      </section>
      <SiteFooter />
      <PasteCatcher onFile={props.onFile} />
    </main>
  );
}

function WatchPitch() {
  return (
    <section className="gutter mt-10" aria-labelledby="watch-h">
      <h2 id="watch-h" className="t-h2">Keep watching the batch</h2>
      <p className="t-muted mt-2">
        A one-off check is easy to forget. Save the pack. If a later FDA or WHO notice names that batch, this phone says “Stop using batch …”, with the notice and the report button.
      </p>
      <p className="t-small t-muted mt-2">
        The registration checker at medverify.versatechq.com does not match a batch to a recall. Scratch codes cover some brands and can fail when SMS is down. A photo still cannot prove a medicine is genuine.
      </p>
      <div className="grid gap-3 mt-4">
        <Link href="/cabinet" className="btn btn-outline btn-block">Medicine cabinet</Link>
        <Link href="/pharmacist" className="btn btn-outline btn-block">Pharmacist stock log</Link>
        <Link href="/digest" className="btn btn-plain btn-block">This week’s notices</Link>
        <Link href="/map" className="btn btn-plain btn-block">Reports by region</Link>
      </div>
    </section>
  );
}

function Examples({ onExample, headingId = "ex-h" }: { onExample: (id: string) => void; headingId?: string }) {
  const icons = [Drop, Pill, Eyedropper];
  return (
    <section className="mt-10" aria-labelledby={headingId}>
      <h2 id={headingId} className="gutter t-label">No pack nearby? Try an example</h2>
      <div className="scroll-x gutter mt-3 pb-1">
        {TRY_EXAMPLES.map((item, index) => {
          const Icon = icons[index] ?? Pill;
          return (
            <button key={item.id} type="button" className="chip chip-link" onClick={() => onExample(item.id)}>
              <Icon className="icon-sm" aria-hidden="true" /> {item.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function How() {
  return (
    <section id="how" className="gutter mt-14" aria-labelledby="how-h">
      <p className="t-eyebrow">How it works</p>
      <h2 id="how-h" className="t-h2 mt-2">Three steps. No sign-up.</h2>
      <ol className="mt-6 grid gap-6">
        <li className="how"><span className="how-ico"><Camera className="icon-sm" aria-hidden="true" /></span><div><p className="t-label">Snap the pack</p><p className="t-muted mt-1">Box, bottle or blister. Keep the batch number sharp.</p></div></li>
        <li className="how"><span className="how-ico"><MagnifyingGlass className="icon-sm" aria-hidden="true" /></span><div><p className="t-label">We check FDA Ghana</p><p className="t-muted mt-1">The name, batch and expiry are read, then FDA alerts and recalls are searched.</p></div></li>
        <li className="how"><span className="how-ico"><ListChecks className="icon-sm" aria-hidden="true" /></span><div><p className="t-label">Get a clear answer</p><p className="t-muted mt-1">Do not use, Check first, or No alerts found, with the FDA notice and what to do.</p></div></li>
      </ol>
    </section>
  );
}

function Who() {
  return (
    <section id="ai" className="gutter mt-14" aria-labelledby="who-h">
      <div className="card divided">
        <div className="p-5">
          <p className="t-eyebrow">Open about our AI</p>
          <h2 id="who-h" className="t-h3 mt-1">Who checks your medicine</h2>
        </div>
        <div className="p-5 flex gap-4 items-start">
          <span className="model-ico model-ico--nemotron"><Scan className="icon-sm" aria-hidden="true" /></span>
          <div><p className="t-label">NVIDIA Nemotron reads the pack</p><p className="t-small t-muted">Name, strength, maker, batch, expiry.</p></div>
        </div>
        <div className="p-5 flex gap-4 items-start">
          <span className="model-ico model-ico--tavily"><GlobeSimple className="icon-sm" aria-hidden="true" /></span>
          <div><p className="t-label">Tavily searches FDA Ghana</p><p className="t-small t-muted">Only fdaghana.gov.gh: recalls, alerts, and notices.</p></div>
        </div>
        <div className="p-5 flex gap-4 items-start">
          <span className="model-ico model-ico--nemotron"><Scales className="icon-sm" aria-hidden="true" /></span>
          <div><p className="t-label">Nemotron matches the batch</p><p className="t-small t-muted">Nano writes the wording. Super only steps in on a live check when the rules are unsure and the spend limit still has room. The rules keep the category.</p></div>
        </div>
      </div>
    </section>
  );
}

function Sos() {
  return (
    <section className="gutter mt-6" aria-labelledby="sos-h">
      <div className="card p-5">
        <h2 id="sos-h" className="t-h3">Feeling unwell after a medicine?</h2>
        <p className="t-muted mt-1">If it’s serious, get help now. Bring the pack.</p>
        <a href={CONTACTS.emergency.href} className="contact contact--urgent">
          <span className="contact-ico"><Siren className="icon-sm" aria-hidden="true" /></span>
          <span><strong>{CONTACTS.emergency.title}</strong><span className="sub">{CONTACTS.emergency.detail}</span></span>
          <CaretRight className="icon-sm contact-go" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

function PasteCatcher({ onFile }: { onFile: (file: File) => void }) {
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = [...(event.clipboardData?.files ?? [])].find((item) => item.type.startsWith("image/"));
      if (file) onFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFile]);
  return null;
}

function Capture(props: {
  tab: Tab;
  setTab: (tab: Tab) => void;
  fields: LabelFields;
  setFields: (fields: LabelFields) => void;
  example: boolean;
  imageDataUrl: string | null;
  quality: Quality;
  hint: string;
  cameraDenied: boolean;
  cameraOn: boolean;
  online: boolean;
  offlineSaved: boolean;
  error: string | null;
  canRetry: boolean;
  preview: ReactNode;
  onShutter: () => void;
  onOpenCamera: () => void;
  onChoose: () => void;
  onSubmit: (event: FormEvent) => void;
  onRetry: () => void;
  onRetake: () => void;
  onTypeInstead: () => void;
  gs1Raw: string;
  setGs1Raw: (value: string) => void;
  scratchReply: string;
  setScratchReply: (value: string) => void;
  lowData: boolean;
}) {
  const unreadable = props.quality !== "ok";
  const accepted = props.quality === "ok" && Boolean(props.imageDataUrl);
  return (
    <form onSubmit={props.onSubmit} className="flex" style={{ flex: 1, flexDirection: "column" }}>
      <main className="gutter pt-5 pb-6" style={{ flex: 1 }}>
        <h1 className="sr-only">Check a medicine</h1>
        <div className="tabs" role="tablist" aria-label="How do you want to add the medicine?">
          {(
            [
              ["photo", "Photo", Camera],
              ["upload", "Upload", UploadSimple],
              ["type", "Type", Keyboard],
            ] as const
          ).map(([id, label, Icon]) => (
            <button key={id} type="button" role="tab" aria-selected={props.tab === id} onClick={() => props.setTab(id)}>
              <Icon className="icon-sm" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {props.tab !== "type" ? (
          <div className="viewfinder mt-5" aria-label="Camera preview. Show the batch number and expiry.">
            <span className="vf-frame" aria-hidden="true" />
            <span className="vf-hint"><Barcode className="icon-xs" aria-hidden="true" /> {props.hint}</span>
            {props.imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="shot" src={props.imageDataUrl} alt="The pack photo you selected" style={unreadable ? { filter: "blur(1.6px)" } : undefined} />
            ) : props.preview ? (
              props.preview
            ) : (
              <button type="button" className="btn btn-outline" onClick={props.tab === "upload" ? props.onChoose : props.onOpenCamera}>
                {props.tab === "upload" ? <UploadSimple className="icon-sm" aria-hidden="true" /> : <Camera className="icon-sm" aria-hidden="true" />}
                {props.tab === "upload" ? "Choose a photo" : "Start camera"}
              </button>
            )}
            {props.example ? <span className="tag-example absolute right-4 bottom-4">EXAMPLE</span> : null}
          </div>
        ) : null}

        {unreadable ? (
          <div className="card p-5 mt-5" role="status">
            <div className="flex gap-4 items-start">
              <div>
                <p className="t-label">{props.quality === "dark" ? "We need more light" : "We can’t read the batch number"}</p>
                <p className="t-small t-muted mt-1">Move closer, add light, and hold still. We won’t guess it.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button type="button" className="btn btn-primary" onClick={props.onRetake}>
                <Camera className="icon-sm" aria-hidden="true" /> Retake
              </button>
              <button type="button" className="btn btn-outline" onClick={props.onTypeInstead}>
                <Keyboard className="icon-sm" aria-hidden="true" /> Type it
              </button>
            </div>
          </div>
        ) : null}

        {props.cameraDenied && props.tab === "upload" ? (
          <p className="t-small t-muted mt-3" role="status">Camera permission was denied, so this step uses Upload instead.</p>
        ) : null}

        {(props.fields.productName || props.fields.batch || props.fields.expiry) && !unreadable ? (
          <div className="mt-5" aria-live="polite">
            <p className="t-small t-muted">We can read</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {props.fields.productName ? <span className="chip chip--read"><Check className="icon-xs" aria-hidden="true" /> {props.fields.productName}</span> : null}
              {props.fields.batch ? <span className="chip chip--read t-mono"><Check className="icon-xs" aria-hidden="true" /> {props.fields.batch}</span> : null}
              {props.fields.expiry ? <span className="chip chip--read t-mono"><Check className="icon-xs" aria-hidden="true" /> {props.fields.expiry}</span> : null}
              {props.example ? <span className="tag-example">EXAMPLE</span> : null}
            </div>
          </div>
        ) : null}

        {props.lowData && props.tab !== "type" ? (
          <div className="note mt-5" role="status">
            <Info className="icon-sm" aria-hidden="true" />
            <div>
              <strong>Low-data mode</strong>
              <p>Photos stay on the phone. Type the name and batch instead.</p>
            </div>
          </div>
        ) : null}

        {props.gs1Raw && props.tab !== "type" ? (
          <p className="t-small mt-3" role="status">Barcode on this phone: <span className="t-mono">{props.gs1Raw}</span></p>
        ) : null}

        {props.tab === "type" ? (
          <div className="grid gap-4 mt-5">
            <div>
              <label className="field-label" htmlFor="name">Product name</label>
              <input id="name" className="input" required value={props.fields.productName} placeholder="As printed on the pack" onChange={(event) => props.setFields({ ...props.fields, productName: event.target.value })} />
            </div>
            <div>
              <label className="field-label" htmlFor="batch">Batch number</label>
              <input id="batch" className="input t-mono" value={props.fields.batch} placeholder="Leave blank if you cannot read it" autoCapitalize="characters" autoCorrect="off" spellCheck={false} onChange={(event) => props.setFields({ ...props.fields, batch: event.target.value.toUpperCase() })} />
            </div>
            <div>
              <label className="field-label" htmlFor="expiry">Expiry</label>
              <input id="expiry" className="input t-mono" value={props.fields.expiry} placeholder="12/2027" autoCorrect="off" onChange={(event) => props.setFields({ ...props.fields, expiry: event.target.value })} />
            </div>
            <div>
              <label className="field-label" htmlFor="maker">Manufacturer</label>
              <input id="maker" className="input" value={props.fields.manufacturer} onChange={(event) => props.setFields({ ...props.fields, manufacturer: event.target.value })} />
            </div>
            <div>
              <label className="field-label" htmlFor="gs1">Barcode or GS1 text</label>
              <input id="gs1" className="input t-mono" value={props.gs1Raw} autoCorrect="off" spellCheck={false} placeholder="(01)…(17)…(10)…" onChange={(event) => props.setGs1Raw(event.target.value)} />
              <p className="t-small t-muted mt-1">Decoded on this phone when a code is in the photo. A mismatch with the printed batch is a red flag.</p>
            </div>
            <div>
              <label className="field-label" htmlFor="scratch">Scratch-code reply</label>
              <textarea id="scratch" className="input" style={{ minHeight: 88, paddingTop: 12 }} value={props.scratchReply} onChange={(event) => props.setScratchReply(event.target.value)} placeholder="Optional. Text the code to 1393, then paste the SMS here." />
              <p className="t-small t-muted mt-1">We do not send the SMS. A reply does not prove the pack is free of quality problems.</p>
            </div>
          </div>
        ) : (
          <div className="note mt-6">
            <Lightbulb className="icon-sm" aria-hidden="true" />
            <div>
              <strong>Can’t find the batch?</strong>
              <p>Look near the expiry date, often on the end flap or the bottom. It may say <span className="t-mono">B.No</span>, <span className="t-mono">LOT</span> or <span className="t-mono">Batch</span>.</p>
            </div>
          </div>
        )}

        {props.offlineSaved ? (
          <div className="card p-6 text-center mt-5" role="status">
            <span className="mx-auto w-14 h-14 rounded-full border border-border grid place-items-center text-text-muted">
              <WifiSlash className="icon-lg" aria-hidden="true" />
            </span>
            <p className="t-h3 mt-4">No internet right now</p>
            <p className="t-muted mt-1">
              {props.imageDataUrl
                ? "We saved your photo on this phone. We’ll check it when you’re back online."
                : "Reconnect, then run the check again."}
            </p>
            <div className="note mt-5 text-left">
              <Info className="icon-sm" aria-hidden="true" />
              <div>
                <strong>Until then</strong>
                <p>Ask your pharmacist, or call the FDA on <span className="nowrap">055 111 2224</span>.</p>
              </div>
            </div>
          </div>
        ) : null}

        {props.error ? (
          <div className="note note--warn mt-5" role="alert">
            <Info className="icon-sm" aria-hidden="true" />
            <div>
              <strong>The check did not finish</strong>
              <p>{props.error}</p>
              {props.canRetry ? (
                <button type="button" className="btn btn-primary mt-3" onClick={props.onRetry}>
                  <ArrowClockwise className="icon-sm" aria-hidden="true" /> Try again
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
      <div className="bottom-bar">
        {props.tab === "photo" && !accepted ? (
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={props.cameraOn ? props.onShutter : props.onOpenCamera}>
            <Camera className="icon-sm" aria-hidden="true" /> {props.cameraOn ? "Take photo" : "Start camera"}
          </button>
        ) : props.tab === "upload" && !accepted ? (
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={props.onChoose}>
            <UploadSimple className="icon-sm" aria-hidden="true" /> Choose a photo
          </button>
        ) : (
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={unreadable}>
            Check medicine <ArrowRight className="icon-sm" aria-hidden="true" />
          </button>
        )}
        <p className="t-small t-subtle text-center mt-2 flex items-center justify-center gap-2">
          <LockSimple className="icon-xs" aria-hidden="true" />
          {props.online && !props.offlineSaved ? "About 10 seconds · Photo not stored" : "Saved on this phone until you are back online."}
        </p>
      </div>
    </form>
  );
}

function Checking({
  stages,
  activeId,
  elapsed,
  slow,
  fields,
  example,
}: {
  stages: TraceStep[];
  activeId?: string;
  elapsed: number;
  slow: boolean;
  fields: LabelFields;
  example: boolean;
}) {
  const byId = new Map(stages.map((step) => [step.id, step]));
  const doneCount = stages.length;
  const stepNumber = Math.min(4, doneCount + 1);
  return (
    <main className="gutter pt-6 pb-6" style={{ flex: 1 }}>
      <div className="flex items-center gap-3">
        <span className="thumb" aria-hidden="true"><Pill className="icon-sm" /></span>
        <div className="min-w-0">
          <p className="t-label">{fields.productName || "Pack"}</p>
          <p className="t-small t-muted flex items-center gap-2 flex-wrap">
            <span className="t-mono nowrap">{fields.batch || "Batch not read"}{fields.expiry ? ` · ${fields.expiry}` : ""}</span>
            {example ? <span className="tag-example">EXAMPLE</span> : null}
          </p>
        </div>
      </div>
      <div className="mt-8 flex items-baseline justify-between">
        <h1 className="t-h2" aria-live="polite">Checking FDA Ghana…</h1>
        <span className="ms" aria-label="Time so far">{(elapsed / 1000).toFixed(1)} s</span>
      </div>
      <div className="progress mt-3" role="progressbar" aria-valuemin={0} aria-valuemax={4} aria-valuenow={doneCount} aria-valuetext={`Step ${stepNumber} of 4`}>
        <span style={{ width: `${Math.min(100, (doneCount / 4) * 100)}%` }} />
      </div>
      <p className="t-small t-muted mt-2">Step {stepNumber} of 4</p>
      <ol className="card divided checklist mt-6" aria-label="What the check is doing">
        {STAGE_ORDER.map((item) => {
          const step = byId.get(item.id);
          const state = step ? (step.status === "error" ? "fail" : "done") : item.id === activeId ? "active" : "pending";
          const modelId = step?.model ?? (item.id === "vision" ? MODEL_DEFAULTS.vision : item.id === "evidence" ? "tavily/search" : item.id === "normalize" ? MODEL_DEFAULTS.normalize : MODEL_DEFAULTS.verdict);
          const StepIcon = state === "done" ? Check : state === "fail" ? X : item.Icon;
          return (
            <li key={item.id} className={state === "done" ? "is-done" : state === "active" ? "is-active" : state === "fail" ? "is-fail" : "is-pending"} aria-current={state === "active" ? "step" : undefined}>
              <span className="check-ico"><StepIcon className="icon-sm" weight={state === "done" || state === "fail" ? "bold" : "regular"} aria-hidden="true" /></span>
              <div>
                <div className="check-head">
                  <p className="check-title">{step?.title ?? item.title}</p>
                  {state === "done" || state === "fail" ? (
                    <span className={state === "fail" ? "status status--fail" : "status status--done"}>{state === "fail" ? "Failed" : `${((step?.durationMs ?? 0) / 1000).toFixed(1)} s`}</span>
                  ) : state === "active" ? (
                    <span className="status status--run"><CircleNotch className="icon-xs spin" aria-hidden="true" /> {(elapsed / 1000).toFixed(1)} s</span>
                  ) : (
                    <span className="status status--wait">Next</span>
                  )}
                </div>
                <p className="mt-2">
                  <span className={modelId?.includes("tavily") ? "model model--tavily" : "model model--nemotron"}>{modelShortName(modelId)}</span>
                </p>
                {modelId ? <p className="model-id mt-1">{modelId}</p> : null}
                {step?.summary ? <p className="t-small t-muted mt-2">{step.summary}</p> : null}
                {state === "active" && item.id === "evidence" ? (
                  <div className="well p-3 mt-2">
                    <p className="t-mono t-muted">site:fdaghana.gov.gh</p>
                    <span className="skeleton mt-2" style={{ width: 128, height: 12 }} />
                  </div>
                ) : null}
                {state === "pending" ? <span className="skeleton mt-2" style={{ width: "70%", height: 12 }} /> : null}
              </div>
            </li>
          );
        })}
      </ol>
      <div className={slow ? "note note--warn mt-6" : "note mt-6"}>
        {slow ? <Clock className="icon-sm" aria-hidden="true" /> : <Info className="icon-sm" aria-hidden="true" />}
        <div>
          <strong>{slow ? "Still checking…" : "While you wait"}</strong>
          <p>{slow ? "Your network is slow. Keep this page open. Don’t take the medicine yet." : "Don’t take or give this medicine until you see the answer."}</p>
        </div>
      </div>
    </main>
  );
}

function ResultView({
  result,
  example,
  onEvidence,
  onFix,
  onAgain,
  onRetry,
}: {
  result: MedicineResult;
  example: boolean;
  onEvidence: () => void;
  onFix: () => void;
  onAgain: () => void;
  onRetry: () => void;
}) {
  if (result.outcome === "search_failed") {
    return (
      <main className="gutter pt-6 pb-12">
        <h1 className="sr-only">The FDA search didn’t answer</h1>
        <div className="card">
          <ol className="divided checklist">
            <li className="is-fail">
              <span className="check-ico"><X className="icon-sm" weight="bold" aria-hidden="true" /></span>
              <div>
                <div className="check-head">
                  <p className="check-title">FDA search didn’t answer</p>
                  <span className="status status--fail">Failed</span>
                </div>
                <p className="t-small t-muted mt-1">We won’t give an answer without the FDA pages.</p>
              </div>
            </li>
          </ol>
          <div className="px-5 pb-5">
            <button type="button" className="btn btn-primary btn-block" onClick={onRetry}>
              <ArrowClockwise className="icon-sm" aria-hidden="true" /> Try again
            </button>
          </div>
        </div>
        <Readback result={result} example={example} onFix={onFix} />
        <CheckDetails result={result} />
        <Contacts presentation="unsure" shareText={shareText(result)} />
        <p className="t-small t-subtle mt-10">{footerDisclaimer()}</p>
      </main>
    );
  }

  const presentation = result.presentation;
  const verdictClass =
    presentation === "do_not_use" ? "verdict--scam" : presentation === "check_first" ? "verdict--suspicious" : presentation === "no_alerts" ? "verdict--ok" : "verdict--unsure";
  const word = presentation === "do_not_use" ? "Do not use" : presentation === "check_first" ? "Check first" : presentation === "no_alerts" ? "No alerts found" : "We’re not sure";
  const kicker =
    presentation === "do_not_use"
      ? result.match === "exact_batch" ? "FDA Ghana alert match" : "FDA Ghana notice"
      : presentation === "check_first" ? "Ask a pharmacist" : presentation === "no_alerts" ? "No FDA Ghana notice matched" : "Low confidence";
  const pct = Math.round(result.confidence * 100);
  const HeadIcon = presentation === "do_not_use" ? WarningOctagon : presentation === "check_first" ? Warning : presentation === "no_alerts" ? CheckCircle : Question;
  const pages = result.evidence.filter((item) => item.role === "match" || item.role === "reviewed").length;

  return (
    <main className="gutter pt-6 pb-12">
      <section className={`verdict ${verdictClass}`} role="status" aria-labelledby="v-word">
        <div className="verdict-strip">
          <HeadIcon className="icon-sm" weight="bold" aria-hidden="true" />
          <h1 id="v-word">{word}</h1>
          <span className="when">{kicker}</span>
        </div>
        <div className="verdict-body">
          {presentation === "unsure" ? (
            <p className="verdict-lead">Treat it as check first. Show the pack to a pharmacist before you use it.</p>
          ) : (
            <p className="verdict-lead">{result.headline}</p>
          )}
          {result.band ? <p className="t-label mt-3">{result.band}</p> : null}
          {result.summary ? (
            <p className="mt-3">
              <CitedText text={result.summary} evidence={result.evidence} />
            </p>
          ) : null}
          {presentation !== "unsure" ? (
            <div className="confidence mt-5">
              <div className="confidence-row">
                <span className="t-muted">{result.match === "exact_batch" ? "FDA match" : result.match === "name_only" ? "Name only" : "No batch match"}</span>
                <span className="font-semibold">{result.match === "exact_batch" ? "Exact batch" : result.match === "name_only" ? "Name only" : "Not sure"} · {pct}%</span>
              </div>
              <div className="bar" role="img" aria-label={`Confidence ${pct} percent`}>
                <span style={{ width: `${pct}%` }} />
              </div>
            </div>
          ) : null}
          <button type="button" className="mt-5 pt-4 border-t flex items-center gap-2 flex-wrap no-underline text-text w-full" onClick={onEvidence} style={{ background: "transparent", borderLeft: 0, borderRight: 0, borderBottom: 0, textAlign: "left" }}>
            <span className="model model--nemotron">Nemotron</span>
            <span className="model model--tavily">Tavily · {pages} page{pages === 1 ? "" : "s"}</span>
            <span className="ml-auto inline-flex items-center gap-1 t-small font-semibold text-link">How we checked <CaretRight className="icon-xs" aria-hidden="true" /></span>
          </button>
        </div>
      </section>

      <CheckDetails result={result} />
      <Contacts presentation={presentation} shareText={shareText(result)} />
      <Readback result={result} example={example} onFix={onFix} />
      <Why result={result} onEvidence={onEvidence} />
      <p className="t-small t-subtle mt-10">{footerDisclaimer()}</p>
      <button type="button" className="btn btn-outline btn-lg btn-block mt-4" onClick={onAgain}>Check another medicine</button>
    </main>
  );
}

function Contacts({ presentation, shareText: text }: { presentation: Presentation; shareText: string }) {
  const stop = presentation === "do_not_use";
  return (
    <section className="mt-10" aria-labelledby="todo-h">
      <h2 id="todo-h" className="t-h2">What to do now</h2>
      <ol className="card divided todo mt-4">
        <li className="todo-item">
          <span className={stop ? "todo-num todo-num--urgent" : "todo-num"}>1</span>
          <div>
            <p className="todo-title">{stop ? "Stop. Don’t take it or give it to a child." : "Show the pack to a pharmacist before you use it."}</p>
            <p className="t-muted mt-1">{stop ? "Keep the bottle and the box. Don’t throw it away." : "These contacts are fixed. A model does not write them."}</p>
          </div>
        </li>
        <li className="todo-item">
          <span className={stop ? "todo-num todo-num--urgent" : "todo-num"}>2</span>
          <div>
            <p className="todo-title">Already taken it? Get help now</p>
            <p className="t-muted mt-1">If someone is seriously unwell, call for an ambulance and take the pack with you.</p>
            <a href={CONTACTS.emergency.href} className="contact contact--urgent">
              <span className="contact-ico"><Siren className="icon-sm" aria-hidden="true" /></span>
              <span><strong>{CONTACTS.emergency.title}</strong><span className="sub">{CONTACTS.emergency.detail}</span></span>
            </a>
          </div>
        </li>
        <li className="todo-item">
          <span className="todo-num">3</span>
          <div>
            <p className="todo-title">Tell FDA Ghana where you got it</p>
            <a href={CONTACTS.fda.href} className="contact">
              <span className="contact-ico"><Phone className="icon-sm" aria-hidden="true" /></span>
              <span><strong className="nowrap">{CONTACTS.fda.title}</strong><span className="sub">{CONTACTS.fda.detail}</span></span>
            </a>
          </div>
        </li>
        <li className="todo-item">
          <span className="todo-num">4</span>
          <div>
            <p className="todo-title">Report a side effect</p>
            <a href={CONTACTS.adr.href} className="contact" rel="noopener noreferrer">
              <span className="contact-ico"><ClipboardText className="icon-sm" aria-hidden="true" /></span>
              <span><strong>{CONTACTS.adr.title}</strong><span className="sub">{CONTACTS.adr.detail}</span></span>
              <ArrowSquareOut className="icon-sm contact-go" aria-hidden="true" />
            </a>
            <a id="share" className="btn btn-outline btn-block mt-3" href={`https://wa.me/?text=${encodeURIComponent(text)}`} rel="noopener noreferrer">
              <WhatsappLogo className="icon-sm" aria-hidden="true" /> Warn family on WhatsApp
            </a>
          </div>
        </li>
      </ol>
    </section>
  );
}

function shareText(result: MedicineResult): string {
  const notice = result.evidence.find((item) => item.role === "match");
  return `${PRODUCT.name}: ${result.fields.productName || "a pack"} batch ${result.fields.batch || "not read"}. ${result.headline} Not medical advice. ${notice?.url ?? ""}`;
}

function Readback({ result, example, onFix }: { result: MedicineResult; example: boolean; onFix: () => void }) {
  const batchKind = result.flags.some((flag) => flag.code === "batch_on_alert") ? "match" : result.fields.batch ? "ok" : "missing";
  const expiryKind = result.flags.some((flag) => flag.code === "expired") ? "expired" : result.fields.expiry ? "ok" : "missing";
  return (
    <section className="card mt-6 px-5 pt-4 pb-2" aria-labelledby="rb-h">
      <div className="flex items-center justify-between gap-2">
        <h2 id="rb-h" className="t-label">What we read</h2>
        <span className="flex items-center gap-2">
          {example ? <span className="tag-example">EXAMPLE</span> : null}
          <button type="button" className="btn btn-plain t-small" onClick={onFix}>
            <PencilSimple className="icon-xs" aria-hidden="true" /> Fix
          </button>
        </span>
      </div>
      <dl className="readback mt-1">
        <dt>Product</dt>
        <dd>{result.fields.productName || "Not read"}</dd>
        <Mark kind={result.fields.productName ? "ok" : "missing"} />
        <dt>Batch</dt>
        <dd className="mono">{result.fields.batch || "Not read"}</dd>
        <Mark kind={batchKind} />
        <dt>Expiry</dt>
        <dd className="mono">{result.fields.expiry || "Not read"}</dd>
        <Mark kind={expiryKind} />
        <dt>Maker</dt>
        <dd>{result.fields.manufacturer || "Not read"}</dd>
        <Mark kind={result.fields.manufacturer ? "ok" : "missing"} />
      </dl>
    </section>
  );
}

function Mark({ kind }: { kind: "match" | "expired" | "ok" | "missing" }) {
  if (kind === "match") return <span className="status status--fail">match</span>;
  if (kind === "expired") return <span className="status status--warn">expired</span>;
  if (kind === "ok") return <span className="text-ok-fg"><Check className="icon-xs" weight="bold" aria-hidden="true" /></span>;
  return <span className="t-small t-muted">—</span>;
}

function Why({ result, onEvidence }: { result: MedicineResult; onEvidence: () => void }) {
  const match = result.evidence.find((item) => item.role === "match");
  const rows: { title: string; body: string; Icon: Icon; tone: string }[] = [];
  if (match) {
    rows.push({
      title: result.match === "exact_batch" ? "Your batch is in an FDA notice" : "The product name is in an FDA notice",
      body: match.note,
      Icon: SealWarning,
      tone: "",
    });
  }
  for (const flag of result.flags) {
    if (flag.code === "batch_on_alert") continue;
    const tone = flag.code === "expired" || flag.code === "expiry_unreadable" ? "reason-ico--warn" : flag.code === "missing_registration" ? "" : "reason-ico--info";
    const Icon = flag.code === "expired" ? CalendarX : flag.code === "missing_registration" ? Prohibit : Info;
    rows.push({ title: flag.detail, body: "", Icon, tone });
  }
  const shown = rows.slice(0, 4);
  if (!shown.length) return null;
  return (
    <section className="mt-10" aria-labelledby="why-h">
      <h2 id="why-h" className="t-h2">Why we say this</h2>
      <div className="card divided mt-4">
        {shown.map((row) => (
          <div className="reason" key={row.title}>
            <span className={`reason-ico ${row.tone}`}><row.Icon className="icon-sm" aria-hidden="true" /></span>
            <div>
              <p className="t-label">{row.title}</p>
              {row.body ? <span className="quote">{row.body}</span> : null}
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-tonal btn-block mt-4" onClick={onEvidence}>
        <FileMagnifyingGlass className="icon-sm" aria-hidden="true" /> See FDA notice and AI steps
      </button>
    </section>
  );
}

function Evidence({ result }: { result: MedicineResult }) {
  const total = result.trace.reduce((sum, step) => sum + step.durationMs, 0);
  const word = result.outcome === "search_failed" ? "No verdict" : result.presentation === "do_not_use" ? "Do not use" : result.presentation === "check_first" ? "Check first" : result.presentation === "no_alerts" ? "No alerts found" : "We’re not sure";
  const pct = Math.round(result.confidence * 100);
  return (
    <main className="gutter pt-6 pb-12">
      <div className="flex items-center gap-3 flex-wrap">
        {result.outcome === "search_failed" ? (
          <span className="status status--fail">No verdict</span>
        ) : (
          <VerdictChip presentation={result.presentation} suffix={result.outcome === "verdict" ? ` · ${pct}%` : ""} />
        )}
        <span className="ms inline-flex items-center gap-1"><Clock className="icon-xs" aria-hidden="true" /> {(total / 1000).toFixed(1)} s total</span>
      </div>
      <h1 className="t-h1 mt-4">Which AI did what</h1>
      <p className="t-muted mt-2">Every step that ran. The ids are the ones this server is set to call.</p>
      <section className="card p-5 mt-6" aria-label="Pipeline and time per step">
        <ol className="flow" aria-label="Pipeline">
          <li className="flow-node"><span className="model-ico"><Camera className="icon-sm" aria-hidden="true" /></span><span className="flow-label">Photo</span><span className="ms">—</span></li>
          {result.trace.map((step) => (
            <li key={step.id} className="flow-node">
              <span className={`model-ico ${step.provider === "tavily" ? "model-ico--tavily" : step.provider === "rules" ? "model-ico--app" : "model-ico--nemotron"}`}>
                {step.id === "evidence" ? <GlobeSimple className="icon-sm" aria-hidden="true" /> : step.id === "verdict" ? <Scales className="icon-sm" aria-hidden="true" /> : <Scan className="icon-sm" aria-hidden="true" />}
              </span>
              <span className="flow-label">{step.title.split(" ")[0]}</span>
              <span className="ms">{(step.durationMs / 1000).toFixed(1)} s</span>
            </li>
          ))}
          <li className="flow-node"><span className="model-ico model-ico--app"><ListChecks className="icon-sm" aria-hidden="true" /></span><span className="flow-label">Rules</span><span className="ms">—</span></li>
        </ol>
      </section>
      <ol className="grid gap-4 mt-6">
        {result.trace.map((step, index) => (
          <li key={step.id} className="card step-card">
            <div className="step-head">
              <span className={`model-ico ${step.provider === "tavily" ? "model-ico--tavily" : "model-ico--nemotron"}`}><Scan className="icon-sm" aria-hidden="true" /></span>
              <div className="flex-1">
                <p className="t-label">{index + 1} · {step.title}</p>
                <p className="t-small t-muted">{step.provider} · {step.status}</p>
              </div>
              <span className={step.status === "error" ? "status status--fail" : "status status--done"}>{(step.durationMs / 1000).toFixed(1)} s</span>
            </div>
            <p className="mt-4">{step.summary}</p>
            <p className="model-id mt-3">{step.model || "No model. App rules only."}</p>
          </li>
        ))}
        <li className="card step-card">
          <div className="step-head">
            <span className="model-ico model-ico--app"><ListChecks className="icon-sm" aria-hidden="true" /></span>
            <div className="flex-1">
              <p className="t-label">Next steps</p>
              <p className="t-small t-muted">{PRODUCT.short} rules · no AI</p>
            </div>
          </div>
          <p className="t-small t-muted mt-3">Official contacts only: 112, FDA hotline 055 111 2224 or 055 111 2225, adr.fdaghana.gov.gh. Checked by hand, never written by the model.</p>
        </li>
      </ol>
      <div className="card p-5 mt-4">
        <p className="t-label">Configured model ids</p>
        <p className="model-id mt-2">Vision {MODEL_DEFAULTS.vision}</p>
        <p className="model-id">Label {MODEL_DEFAULTS.normalize}</p>
        <p className="model-id">Verdict {MODEL_DEFAULTS.verdict}</p>
      </div>
      <div className="mt-4">
        {result.evidence.map((item, index) => (
          <a key={item.url} className="source" href={item.url} rel="noopener noreferrer">
            <span className="source-num">{index + 1}</span>
            <span>
              <span className="source-title">{item.title}</span>
              <span className="source-host">{item.publisher} · {item.role}</span>
            </span>
            <ArrowSquareOut className="icon-xs text-text-subtle" aria-hidden="true" />
          </a>
        ))}
      </div>
      <div className="note mt-6">
        <Info className="icon-sm" aria-hidden="true" />
        <div>
          <strong>About this check</strong>
          <p>Answer shown: {word}. We only search FDA Ghana pages for a live check. “No alerts found” is not a promise the pack is right for you.</p>
        </div>
      </div>
    </main>
  );
}

type BatchRow = {
  name: string;
  detail: string;
  batch: string;
  presentation: Presentation;
  source: string;
  href?: string;
};

const EXAMPLE_ROWS: BatchRow[] = [
  {
    name: "Para Clear Suspension 125",
    detail: "Real FDA Ghana alert, June 2023",
    batch: "L220008",
    presentation: "do_not_use",
    source: "FDA alert, Jun 2023",
    href: "https://fdaghana.gov.gh/safety-alert-substandard-paracetamol-suspension-received-from-republic-of-liberia/",
  },
  {
    name: "Metformin illustration",
    detail: "Not a check. Shown only as a Check first chip.",
    batch: "unreadable",
    presentation: "check_first",
    source: "Illustration, not an FDA match",
  },
  {
    name: "Amoxicillin illustration",
    detail: "Not a check. Shown only as a No alerts chip.",
    batch: "AX23091",
    presentation: "no_alerts",
    source: "Illustration, not a live search",
  },
];

function VerdictChip({ presentation, suffix = "" }: { presentation: Presentation; suffix?: string }) {
  const map = {
    do_not_use: ["vchip vchip--scam", "Do not use", WarningOctagon],
    check_first: ["vchip vchip--suspicious", "Check first", Warning],
    no_alerts: ["vchip vchip--ok", "No alerts found", CheckCircle],
    unsure: ["status status--warn", "Not sure", Question],
  } as const;
  const [klass, label, Icon] = map[presentation];
  return (
    <span className={klass}>
      <Icon className="icon-xs" weight="fill" aria-hidden="true" /> {label}{suffix}
    </span>
  );
}
