import type { ReactNode } from "react";
import type { View } from "./Nav";

interface Props {
  onNavigate: (view: View) => void;
  onBrowse: (tab: string) => void;
  onApply: (role: "seller" | "landlord" | "service_provider") => void;
  onTrustSafety: () => void;
}

export default function SiteFooter({ onNavigate, onBrowse, onApply, onTrustSafety }: Props) {
  return (
    <footer className="border-t" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="max-w-7xl mx-auto px-5 md:px-10 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-10">
          <div className="col-span-2 md:col-span-1">
            <button type="button" onClick={() => { onNavigate("landing"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="font-display text-2xl font-semibold mb-3" style={{ color: "var(--primary)" }}>Ziba</button>
            <p className="max-w-xs text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>East Africa&apos;s trusted marketplace for products, property, and services.</p>
          </div>
          <FooterGroup title="Marketplace">
            <FooterLink onClick={() => onBrowse("Products")}>Products</FooterLink>
            <FooterLink onClick={() => onBrowse("Properties")}>Properties</FooterLink>
            <FooterLink onClick={() => onBrowse("Services")}>Services</FooterLink>
          </FooterGroup>
          <FooterGroup title="Sellers">
            <FooterLink onClick={() => onApply("seller")}>Become a Seller</FooterLink>
            <FooterLink onClick={() => onApply("landlord")}>Landlord Portal</FooterLink>
            <FooterLink onClick={() => onApply("service_provider")}>Service Providers</FooterLink>
          </FooterGroup>
          <FooterGroup title="Company">
            <FooterLink onClick={() => onNavigate("about")}>About Ziba</FooterLink>
            <FooterLink onClick={onTrustSafety}>Trust &amp; Safety</FooterLink>
            <FooterLink onClick={() => onNavigate("careers")}>Careers</FooterLink>
          </FooterGroup>
          <FooterGroup title="Support">
            <FooterLink onClick={() => onNavigate("help")}>Help Center</FooterLink>
            <FooterLink onClick={() => onNavigate("contact")}>Contact Us</FooterLink>
            <FooterLink onClick={() => onNavigate("report")}>Report</FooterLink>
          </FooterGroup>
        </div>
        <div className="mt-12 pt-6 border-t flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
          <span>© 2026 Ziba Technologies Ltd. All rights reserved.</span>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <FooterLink onClick={() => onNavigate("privacy")}>Privacy Policy</FooterLink>
            <FooterLink onClick={() => onNavigate("terms")}>Terms of Use</FooterLink>
            <FooterLink onClick={() => onNavigate("cookies")}>Cookie Policy</FooterLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({ title, children }: { title: string; children: ReactNode }) {
  return <div><h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--muted-foreground)" }}>{title}</h2><div className="flex flex-col items-start gap-3">{children}</div></div>;
}

function FooterLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="text-left text-sm transition-colors hover:text-[var(--primary)]" style={{ color: "var(--foreground)" }}>{children}</button>;
}
