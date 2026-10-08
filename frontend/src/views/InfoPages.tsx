import { IcArrowRight, IcShieldCheck } from "../lib/icons";
import type { View } from "../components/Nav";

interface Props {
  page: "about" | "trust";
  onNavigate: (page: View) => void;
}

export default function InfoPages({ page, onNavigate }: Props) {
  const isTrust = page === "trust";
  const cards = isTrust
    ? [
        ["Verified listers", "Sellers and landlords go through identity checks before they can list."],
        ["Protected documents", "Identity documents use private storage and can only be opened by platform reviewers."],
        ["Community reports", "Report listings, accounts, or messages with a reason so our team can investigate."],
        ["Reviews with context", "Only the buyer on a completed marketplace request can leave one review for that request."],
      ]
    : [
        ["Find your fit", "Browse goods, homes, and services in one place."],
        ["Meet the people", "Message a lister directly and get your questions answered."],
        ["Make a plan", "Arrange a purchase, viewing, or service together."],
        ["Share your experience", "Leave a review after your request is complete."],
      ];

  return (
    <main className="page-shell py-12 md:py-20">
      <button type="button" onClick={() => onNavigate("landing")} className="text-sm font-medium mb-8 hover:underline" style={{ color: "var(--primary)" }}>← Back to Ziba</button>
      <section className="rounded-[2rem] p-8 md:p-14" style={{ background: isTrust ? "#1A2925" : "var(--secondary)", color: isTrust ? "white" : "var(--foreground)" }}>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: isTrust ? "#E8A267" : "var(--primary)" }}>{isTrust && <IcShieldCheck size={15} />}{isTrust ? "Trust & Safety" : "About Ziba"}</div>
        <h1 className="font-display text-4xl md:text-6xl max-w-3xl">{isTrust ? "Confidence at every step." : "Good finds. Good people."}</h1>
        <p className="mt-5 max-w-2xl leading-relaxed" style={{ color: isTrust ? "rgba(255,255,255,.72)" : "var(--muted-foreground)" }}>{isTrust ? "We make it easier to find people you can feel good about doing business with." : "Ziba brings products, homes, and skilled services together in one trusted marketplace, built for the way people live and do business across East Africa."}</p>
      </section>
      <section className="py-12 md:py-16">
        <h2 className="font-display text-3xl mb-7">{isTrust ? "How we build trust" : "A simple way to find your next thing"}</h2>
        <div className="grid sm:grid-cols-2 gap-4">{cards.map(([title, body], index) => <article key={title} className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--card)" }}><span className="font-mono-data text-xs" style={{ color: "var(--primary)" }}>{String(index + 1).padStart(2, "0")}</span><h3 className="font-display text-xl mt-3 mb-2">{title}</h3><p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{body}</p></article>)}</div>
      </section>
      <div className="rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5" style={{ background: "var(--secondary)" }}>
        <div><h2 className="font-display text-2xl">{isTrust ? "Need help with a concern?" : "Ready to explore?"}</h2><p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>{isTrust ? "Our support team can help with account or safety questions." : "Browse the latest products, properties, and services."}</p></div>
        <button type="button" onClick={() => onNavigate(isTrust ? "contact" : "browse")} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-semibold text-sm shrink-0" style={{ background: "var(--primary)", color: "white" }}>{isTrust ? "Contact support" : "Explore marketplace"}<IcArrowRight size={15}/></button>
      </div>
    </main>
  );
}
