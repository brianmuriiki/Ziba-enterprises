import { IcArrowRight } from "../lib/icons";

type LegalPage = "privacy" | "terms" | "cookies";

interface Props {
  page: LegalPage;
  onNavigate: (page: "landing" | "contact") => void;
}

const content: Record<LegalPage, { title: string; intro: string; sections: [string, string][] }> = {
  privacy: {
    title: "Privacy Policy",
    intro: "This policy explains how Ziba handles information when you use our marketplace. Use the contact page if you have a question or request about your information.",
    sections: [
      ["Information you provide", "When you create an account, contact another user, apply to list, or submit a report, you may provide details such as your name, email address, profile information, listing details, and the contents of your messages or reports."],
      ["How information is used", "We use information to operate accounts and listings, help users communicate, review applications, respond to reports, protect the marketplace, and improve the service."],
      ["Sharing", "Information may be visible to other users when you choose to publish it in a profile or listing. We may also share information with service providers that help run Ziba, or when required to protect users, enforce our terms, or comply with law."],
      ["Retention and security", "We retain information for as long as needed to provide the service and meet operational or legal needs. We use safeguards designed to protect information, though no online service can guarantee absolute security."],
      ["Your choices", "You can update some account information through your account. To ask about accessing, correcting, or deleting information associated with your account, contact us. Some records may need to be retained for safety, dispute resolution, or legal reasons."],
      ["Policy updates", "We may update this policy as Ziba changes. We will post the current version on this page and update its effective date when changes are made."],
    ],
  },
  terms: {
    title: "Terms of Use",
    intro: "These terms cover your use of Ziba’s marketplace for products, property, and services. By using Ziba, you agree to follow these terms and applicable law.",
    sections: [
      ["Using the marketplace", "You are responsible for the information you submit and for keeping your account credentials secure. Provide accurate details, use the service lawfully, and do not impersonate others or interfere with the platform."],
      ["Listings and transactions", "Listers are responsible for the accuracy and legality of their listings. Buyers, renters, providers, and listers should communicate clearly and make their own decisions about transactions. Unless expressly stated on a listing, Ziba is not a party to transactions between users."],
      ["Safety and reports", "Do not post fraudulent, harmful, discriminatory, or prohibited content. You can report concerning listings or messages for review. Ziba may remove content, restrict features, or suspend accounts when necessary to protect users or the service."],
      ["Intellectual property", "You retain rights to content you submit. You give Ziba permission to display and use that content as needed to operate and promote the marketplace. Do not use Ziba branding or another person’s content without permission."],
      ["Availability and changes", "We work to keep Ziba available, but features may change or be interrupted. We may update these terms and will publish the current version here."],
      ["Contact", "Questions about these terms can be sent through the Contact Us page."],
    ],
  },
  cookies: {
    title: "Cookie Policy",
    intro: "Cookies and similar browser storage can help websites remember preferences and maintain sessions. This page describes their general purpose on Ziba.",
    sections: [
      ["What cookies do", "A cookie is a small piece of data stored by your browser. Similar technologies can remember settings, support sign-in, and help a site understand how its pages are used."],
      ["How Ziba uses them", "Ziba and the services that support it may use browser storage or cookies to keep the service working, maintain account sessions, remember preferences, and diagnose performance or reliability issues."],
      ["Your controls", "Most browsers let you review, block, or delete cookies in their settings. Blocking storage may sign you out or prevent some marketplace features from working correctly."],
      ["Changes", "We may update this policy if our use of cookies or similar technologies changes. The current version will be posted here."],
    ],
  },
};

export default function LegalPages({ page, onNavigate }: Props) {
  const document = content[page];
  return (
    <main className="max-w-4xl mx-auto px-5 md:px-10 py-12 md:py-20">
      <button type="button" onClick={() => onNavigate("landing")} className="text-sm font-medium mb-8 hover:underline" style={{ color: "var(--primary)" }}>← Back to Ziba</button>
      <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--primary)" }}>Ziba policies</p>
      <h1 className="font-display text-4xl md:text-5xl">{document.title}</h1>
      <p className="mt-4 mb-10 max-w-3xl leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{document.intro}</p>
      <div className="space-y-8">{document.sections.map(([title, body]) => <section key={title}><h2 className="font-display text-2xl mb-2">{title}</h2><p className="leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{body}</p></section>)}</div>
      <button type="button" onClick={() => onNavigate("contact")} className="inline-flex items-center gap-2 mt-12 text-sm font-semibold" style={{ color: "var(--primary)" }}>Questions? Contact us <IcArrowRight size={15}/></button>
    </main>
  );
}
