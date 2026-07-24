// Corner-bracket accent on card headers — real detail adapted from a
// design reference, small technical framing marks rather than a plain
// border. Extracted from Dashboard.jsx into a shared component now
// that it's genuinely reused across pages, not duplicated per-page.
export default function CardHead({ children }) {
  return (
    <div className="relative px-5 pt-4 pb-0">
      <span className="absolute -left-px -top-px w-2.5 h-2.5 border-l border-t border-ink-700 pointer-events-none" />
      <span className="absolute -right-px -top-px w-2.5 h-2.5 border-r border-t border-ink-700 pointer-events-none" />
      {children}
    </div>
  );
}
