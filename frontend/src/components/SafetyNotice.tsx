import { IcShield } from "../lib/icons";

export default function SafetyNotice({ children }: { children: React.ReactNode }) {
  return (
    <aside className="flex gap-2.5 rounded-xl border px-3.5 py-3 text-xs leading-relaxed" role="note" style={{ borderColor: "#D6E7DF", background: "#F0F7F3", color: "#315C4E" }}>
      <span className="shrink-0 mt-0.5"><IcShield size={15} /></span>
      <span>{children}</span>
    </aside>
  );
}
