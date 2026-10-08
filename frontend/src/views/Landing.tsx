import { useAuth } from "../lib/auth-context";
import { IcArrowRight, IcCheck, IcHome, IcShieldCheck, IcShoppingBag, IcWrench } from "../lib/icons";

interface Props {
  setView: (view: string) => void;
  setActiveTab: (tab: string) => void;
  onSignUp: () => void;
}

export default function Landing({ setView, setActiveTab, onSignUp }: Props) {
  const { user } = useAuth();
  function browse(tab = "Products") { setActiveTab(tab); setView("browse"); window.scrollTo({ top: 0, behavior: "smooth" }); }

  return <div>
    <section className="page-shell py-10 md:py-14 2xl:py-20 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-8 xl:gap-12 items-center">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium mb-6" style={{ color: "var(--accent)", background: "var(--trust-badge)" }}><IcShieldCheck size={14} /> A more trusted marketplace for Kenya</div>
        <h1 className="font-display text-5xl md:text-6xl 2xl:text-7xl leading-[1.02] tracking-tight mb-6">Good finds.<br/><span style={{ color: "var(--primary)" }}>Good people.</span></h1>
        <p className="text-lg md:text-xl max-w-xl leading-relaxed mb-8" style={{ color: "var(--muted-foreground)" }}>Shop local goods, find a place to call home, or book a skilled professional. Every lister is verified by our team.</p>
        <div className="flex flex-wrap gap-3"><button onClick={() => browse("Products")} className="px-6 py-3 rounded-full font-semibold flex items-center gap-2" style={{ background: "var(--primary)", color: "white" }}>Explore marketplace <IcArrowRight/></button>{!user && <button onClick={onSignUp} className="px-6 py-3 rounded-full font-semibold border" style={{ borderColor: "var(--border)" }}>Create an account</button>}</div>
        <div className="flex items-center gap-3 mt-9 text-sm" style={{ color: "var(--muted-foreground)" }}><div className="flex -space-x-2">{["#C4621D", "#1D5C4E", "#8062A6"].map((c) => <span key={c} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-white" style={{ background: c, borderColor: "var(--background)" }}><IcCheck size={13}/></span>)}</div><span>Made for the way we live and do business.</span></div>
      </div>
      <div className="grid grid-cols-2 gap-3 h-[320px] sm:h-[380px] lg:h-[min(420px,62vh)] 2xl:h-[min(500px,62vh)] min-h-[320px]">
        <div className="rounded-[2rem] overflow-hidden row-span-2 relative"><img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900&auto=format&fit=crop" alt="Colorful local fashion"/><div className="absolute bottom-4 left-4 right-4 rounded-2xl p-4 backdrop-blur" style={{ background: "var(--card)", color: "var(--foreground)" }}><b className="font-display text-lg">A little more local</b><p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Thoughtful finds from verified sellers</p></div></div>
        <div className="rounded-[2rem] overflow-hidden relative"><img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=700&auto=format&fit=crop" alt="Bright modern home"/><span className="absolute bottom-3 left-3 rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1" style={{ background: "color-mix(in srgb, var(--card) 92%, transparent)", color: "var(--foreground)" }}><IcHome size={12}/> Homes to rent</span></div>
        <div className="rounded-[2rem] overflow-hidden relative"><img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=700&auto=format&fit=crop" alt="Professional electrician at work"/><span className="absolute bottom-3 left-3 rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1" style={{ background: "color-mix(in srgb, var(--card) 92%, transparent)", color: "var(--foreground)" }}><IcWrench size={12}/> Trusted services</span></div>
      </div>
    </section>

    <section className="page-shell py-14 md:py-16"><div className="mb-7"><p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--primary)" }}>Start exploring</p><h2 className="font-display text-3xl md:text-4xl">What are you looking for?</h2></div><div className="grid md:grid-cols-3 gap-4">{[["Products", "Everyday goods with a local touch", <IcShoppingBag/>], ["Properties", "A place that feels like yours", <IcHome/>], ["Services", "People who know their craft", <IcWrench/>]].map(([title, desc, icon]) => <button key={String(title)} onClick={() => browse(String(title))} className="text-left p-6 rounded-3xl border hover:-translate-y-1 transition-transform" style={{ background: "var(--secondary)", borderColor: "var(--border)" }}><span className="w-11 h-11 rounded-2xl flex items-center justify-center mb-6" style={{ color: "var(--primary)", background: "var(--card)" }}>{icon}</span><b className="font-display text-2xl block">{title}</b><span className="block text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>{desc}</span><span className="inline-flex mt-5 items-center gap-2 text-sm font-semibold" style={{ color: "var(--primary)" }}>Explore {String(title).toLowerCase()} <IcArrowRight size={15}/></span></button>)}</div></section>

    <section className="page-shell py-10 md:py-16 grid lg:grid-cols-2 gap-10 xl:gap-16 items-center">
      <div>
        <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "var(--primary)" }}>A good find becomes a conversation</p>
        <h2 className="font-display text-3xl md:text-5xl leading-tight">See it. Ask about it. Make it yours.</h2>
        <p className="mt-4 max-w-xl leading-relaxed" style={{ color: "var(--muted-foreground)" }}>Find something you like, message the seller through Ziba, and agree on the details directly. Here’s a quick example of how it can work.</p>
        <ol className="mt-7 space-y-4">
          {["Browse clear photos and listing details.", "Ask the seller a question in Messages.", "Confirm the price and pickup or delivery details together."].map((step, index) => <li key={step} className="flex items-start gap-3"><span className="mt-0.5 w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: "#EAF2F0", color: "var(--accent)" }}>{index + 1}</span><span className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{step}</span></li>)}
        </ol>
        <button type="button" onClick={() => browse("Products")} className="inline-flex items-center gap-2 mt-7 px-5 py-3 rounded-full font-semibold text-sm" style={{ background: "var(--primary)", color: "white" }}>Browse products <IcArrowRight size={16}/></button>
      </div>

      <div className="buying-story-stage" aria-hidden="true">
        <div className="buying-story-glow" />
        <div className="buying-story-product rounded-2xl border p-4 sm:p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <img src="https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=240&h=240&fit=crop&auto=format" alt="Example handwoven tote bag" className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <span className="inline-block text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--accent)" }}>Example listing</span>
              <h3 className="font-display text-lg sm:text-xl leading-tight">Handwoven market tote</h3>
              <p className="font-mono-data text-sm mt-1" style={{ color: "var(--primary)" }}>KES 2,400</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Listed by Amina</span>
            <span className="buying-story-message-button text-xs rounded-full px-3 py-2 font-semibold" style={{ background: "var(--primary)", color: "white" }}>Message seller</span>
          </div>
        </div>
        <div className="buying-story-pointer" aria-hidden="true">👆</div>
        <div className="buying-story-chat buying-story-chat-one rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
          <span className="block text-[10px] font-semibold mb-1" style={{ color: "var(--accent)" }}>You</span>
          <span className="text-xs sm:text-sm">Hi! Is the tote still available?</span>
        </div>
        <div className="buying-story-chat buying-story-chat-two rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
          <span className="block text-[10px] font-semibold mb-1" style={{ color: "var(--primary)" }}>Amina · Seller</span>
          <span className="text-xs sm:text-sm">Yes! We can arrange a convenient pickup.</span>
        </div>
        <div className="buying-story-confirm flex items-center gap-2 rounded-full px-4 py-2.5 shadow-sm">
          <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--accent)", color: "white" }}><IcCheck size={12}/></span>
          <span className="text-xs font-semibold">Next step agreed</span>
        </div>
        <span className="absolute bottom-4 left-0 right-0 text-center text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,.65)" }}>Example conversation · no payment shown</span>
      </div>
    </section>

    <section className="page-shell pb-14 md:pb-20">
      <div className="rounded-[2rem] p-8 md:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8" style={{ background: "#1A2925", color: "white" }}>
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[.2em] font-semibold mb-3" style={{ color: "#E8A267" }}>A little more for less</p>
          <h2 className="font-display text-3xl md:text-5xl">Find something good. Pay a little less.</h2>
          <p className="mt-4 leading-relaxed text-white/70">Explore products whose sellers have marked down the price. Every deal shows its current price alongside the original.</p>
        </div>
        <button type="button" onClick={() => { setView("hot-deals"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold" style={{ background: "#E8A267", color: "#1A2925" }}>Explore Hot Deals <IcArrowRight size={17}/></button>
      </div>
    </section>

    <section className="page-shell py-14 md:py-20 border-y" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="mb-8"><p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--primary)" }}>How Ziba works</p><h2 className="font-display text-3xl md:text-4xl">A better way to find your next thing</h2></div>
      <div className="grid md:grid-cols-3 gap-5">
        {[["01", "Explore locally", "Browse products, homes, and services from people and businesses around Kenya."], ["02", "Check the details", "Review photos, descriptions, seller information, and prices before you decide."], ["03", "Talk directly", "Contact the lister through Ziba to ask questions and agree on the next step."]].map(([number, title, body]) => <article key={number} className="rounded-2xl border p-6 md:p-8" style={{ borderColor: "var(--border)", background: "var(--background)" }}><span className="font-mono-data text-sm" style={{ color: "var(--primary)" }}>{number}</span><h3 className="font-display text-2xl mt-4">{title}</h3><p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{body}</p></article>)}
      </div>
    </section>

    <section className="page-shell py-14 md:py-20">
      <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-center rounded-[2rem] p-8 md:p-12" style={{ background: "var(--seller-callout)", color: "var(--foreground)" }}>
        <div><p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--primary)" }}>For local sellers</p><h2 className="font-display text-3xl md:text-4xl">Your next customer is looking.</h2><p className="mt-3 max-w-2xl leading-relaxed" style={{ color: "var(--muted-foreground)" }}>Apply to list products, property, or services on a marketplace made for the way people live and do business across East Africa.</p></div>
        <button type="button" onClick={() => { if (user) setView("dashboard"); else onSignUp(); }} className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>{user ? "Open your dashboard" : "Join Ziba"} <IcArrowRight size={17}/></button>
      </div>
    </section>

    <section className="page-shell pb-14 md:pb-20">
      <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-8 xl:gap-14 rounded-[2rem] border p-8 md:p-12" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div><p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "var(--primary)" }}>A few smart checks</p><h2 className="font-display text-3xl md:text-4xl">Take a moment before you buy.</h2><p className="mt-3 leading-relaxed text-sm" style={{ color: "var(--muted-foreground)" }}>A little care helps make marketplace conversations clearer and safer.</p></div>
        <div className="grid sm:grid-cols-3 gap-5">
          {[["Review the listing", "Check the photos, description, and what’s included."], ["Ask questions", "Confirm condition, availability, and any details that matter to you."], ["Agree directly", "Set the final price and delivery or pickup arrangements with the seller."]].map(([title, body]) => <article key={title}><h3 className="font-semibold text-sm">{title}</h3><p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{body}</p></article>)}
        </div>
      </div>
    </section>


  </div>;
}
