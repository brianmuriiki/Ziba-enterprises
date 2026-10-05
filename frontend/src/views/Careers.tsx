import { IcArrowRight } from "../lib/icons";

interface Props {
  onNavigate: (page: "landing" | "contact") => void;
}

export default function Careers({ onNavigate }: Props) {
  return (
    <main className="max-w-5xl mx-auto px-5 md:px-10 py-12 md:py-20">
      <button type="button" onClick={() => onNavigate("landing")} className="text-sm font-medium mb-8 hover:underline" style={{ color: "var(--primary)" }}>← Back to Ziba</button>
      <section className="rounded-[2rem] p-8 md:p-14" style={{ background: "#1A2925", color: "white" }}>
        <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "#E8A267" }}>Careers at Ziba</p>
        <h1 className="font-display text-4xl md:text-6xl max-w-3xl">Help make local commerce work better.</h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-white/70">We’re building a more trusted way for people across East Africa to discover products, homes, and services. We’re glad you’re interested in working with us.</p>
      </section>
      <section className="py-12 md:py-16 grid md:grid-cols-[1fr_0.8fr] gap-10 items-start">
        <div><h2 className="font-display text-3xl mb-3">Open opportunities</h2><p className="leading-relaxed" style={{ color: "var(--muted-foreground)" }}>There are no roles posted here right now. Check back for future opportunities, or send us a note to introduce yourself and the kind of work you’d like to do.</p></div>
        <div className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--card)" }}><h2 className="font-display text-2xl">Interested in joining us?</h2><p className="text-sm mt-2 mb-5 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>Tell us about your experience and how you’d like to contribute.</p><button type="button" onClick={() => onNavigate("contact")} className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm" style={{ background: "var(--primary)", color: "white" }}>Get in touch <IcArrowRight size={15}/></button></div>
      </section>
    </main>
  );
}
