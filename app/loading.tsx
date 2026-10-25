export default function Loading() {
  return (
    <div className="app" aria-busy="true" aria-live="polite">
      <div className="gutter pt-6 grid gap-4">
        <span className="skeleton" style={{ width: 148, height: 28 }} />
        <span className="skeleton" style={{ width: "86%", height: 20 }} />
        <span className="skeleton" style={{ width: "64%", height: 20 }} />
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}
