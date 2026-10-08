import { useState } from "react";
import { IcArrowRight } from "../lib/icons";

type SupportPage = "help" | "contact" | "report";

interface Props {
  page: SupportPage;
  onNavigate: (page: "landing" | "browse" | "contact") => void;
}

const questions = [
  ["How do I get started?", "Browse products, properties, or services. Create an account when you are ready to contact a lister."],
  ["How are listers verified?", "Sellers and landlords apply to list, and our team reviews their identity before approval."],
  ["How do I contact a lister?", "Open a listing and choose Contact lister to start a private conversation."],
  ["How do I report a listing?", "Open the listing, choose Report, and tell our moderation team what concerns you."],
  ["How can I avoid payment scams?", "Inspect the item or view the home before paying. Confirm money in your own account instead of trusting a screenshot. Never share a PIN or one-time code. Ziba does not collect payments on listing pages."],
  ["Is a verified badge a guarantee?", "No. Verification means Ziba reviewed the lister’s submitted information. Still check the listing and agree on safe arrangements before paying."],
];

export default function SupportPages({ page, onNavigate }: Props) {
  const [sent, setSent] = useState(false);
  const title = page === "help" ? "Help Center" : page === "contact" ? "Contact Us" : "Report a concern";
  const eyebrow = page === "help" ? "Answers and guidance" : page === "contact" ? "We’re here to help" : "Help keep Ziba trusted";

  return (
    <main className="page-shell py-12 md:py-20">
      <button type="button" onClick={() => onNavigate("landing")} className="text-sm font-medium mb-8 hover:underline" style={{ color: "var(--primary)" }}>← Back to Ziba</button>
      <div className="mb-10">
        <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--primary)" }}>{eyebrow}</p>
        <h1 className="font-display text-4xl md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          {page === "help" && "Quick answers to help you buy, rent, sell, and book with confidence."}
          {page === "contact" && "Tell us what you need help with and our team will get back to you."}
          {page === "report" && "See something unsafe, misleading, or against our community standards? Let our moderation team know."}
        </p>
      </div>

      {page === "help" && <div className="space-y-3">{questions.map(([question, answer]) => <details key={question} className="rounded-2xl border p-5 group" style={{ borderColor: "var(--border)", background: "var(--card)" }}><summary className="cursor-pointer font-semibold list-none flex items-center justify-between gap-4">{question}<span className="text-xl font-normal" style={{ color: "var(--primary)" }}>+</span></summary><p className="mt-3 leading-relaxed text-sm" style={{ color: "var(--muted-foreground)" }}>{answer}</p></details>)}<button type="button" onClick={() => onNavigate("contact")} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--primary)" }}>Still need help? Contact us <IcArrowRight size={15}/></button></div>}

      {page === "contact" && (sent ? <div className="p-6 rounded-2xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}><h2 className="font-display text-2xl">Your email is ready</h2><p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>Complete sending it from your email app to reach the Ziba support team.</p></div> : <form className="p-6 md:p-8 rounded-2xl border space-y-5" style={{ borderColor: "var(--border)", background: "var(--card)" }} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const subject = encodeURIComponent(String(data.get("subject"))); const body = encodeURIComponent(`Name: ${data.get("name")}\nEmail: ${data.get("email")}\n\n${data.get("message")}`); window.location.href = `mailto:support@ziba.co.ke?subject=${subject}&body=${body}`; setSent(true); }}>
        <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm font-medium">Your name<input name="name" required className="input-base mt-2" placeholder="Name" style={{ background: "var(--background)" }}/></label><label className="text-sm font-medium">Email address<input name="email" required type="email" className="input-base mt-2" placeholder="you@example.com" style={{ background: "var(--background)" }}/></label></div>
        <label className="block text-sm font-medium">Subject<input name="subject" required className="input-base mt-2" placeholder="How can we help?" style={{ background: "var(--background)" }}/></label>
        <label className="block text-sm font-medium">Message<textarea name="message" required rows={5} className="input-base mt-2 resize-y" placeholder="Share a few details…" style={{ background: "var(--background)" }}/></label>
        <button type="submit" className="px-5 py-3 rounded-full font-semibold text-sm" style={{ background: "var(--primary)", color: "white" }}>Send message</button>
      </form>)}

      {page === "report" && <div className="rounded-2xl border p-6 md:p-8" style={{ borderColor: "var(--border)", background: "var(--card)" }}><h2 className="font-display text-2xl">Report a listing</h2><p className="mt-2 mb-6 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>Reports are tied to a specific listing so our team can review the right details. Find it in the marketplace, open it, and select <b>Report</b>. You’ll need to sign in to submit a report.</p><button type="button" onClick={() => onNavigate("browse")} className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm" style={{ background: "var(--primary)", color: "white" }}>Browse listings <IcArrowRight size={15}/></button><div className="mt-8 pt-6 border-t" style={{ borderColor: "var(--border)" }}><p className="text-sm" style={{ color: "var(--muted-foreground)" }}>For account or safety concerns that aren’t about a listing, <button type="button" onClick={() => onNavigate("contact")} className="underline font-semibold" style={{ color: "var(--primary)" }}>contact support</button>.</p></div></div>}
    </main>
  );
}
