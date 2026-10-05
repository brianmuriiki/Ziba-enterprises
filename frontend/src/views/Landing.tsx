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
    <section className="max-w-7xl mx-auto px-5 md:px-10 py-10 md:py-14 2xl:py-20 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-8 xl:gap-12 items-center">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium mb-6" style={{ color: "var(--accent)", background: "#EAF2F0" }}><IcShieldCheck size={14} /> A more trusted marketplace for Kenya</div>
        <h1 className="font-display text-5xl md:text-6xl 2xl:text-7xl leading-[1.02] tracking-tight mb-6">Good finds.<br/><span style={{ color: "var(--primary)" }}>Good people.</span></h1>
        <p className="text-lg md:text-xl max-w-xl leading-relaxed mb-8" style={{ color: "var(--muted-foreground)" }}>Shop local goods, find a place to call home, or book a skilled professional. Every lister is verified by our team.</p>
        <div className="flex flex-wrap gap-3"><button onClick={() => browse("Products")} className="px-6 py-3 rounded-full font-semibold flex items-center gap-2" style={{ background: "var(--primary)", color: "white" }}>Explore marketplace <IcArrowRight/></button>{!user && <button onClick={onSignUp} className="px-6 py-3 rounded-full font-semibold border" style={{ borderColor: "var(--border)" }}>Create an account</button>}</div>
        <div className="flex items-center gap-3 mt-9 text-sm" style={{ color: "var(--muted-foreground)" }}><div className="flex -space-x-2">{["#C4621D", "#1D5C4E", "#8062A6"].map((c) => <span key={c} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-white" style={{ background: c, borderColor: "var(--background)" }}><IcCheck size={13}/></span>)}</div><span>Made for the way we live and do business.</span></div>
      </div>
      <div className="grid grid-cols-2 gap-3 h-[320px] sm:h-[380px] lg:h-[min(420px,62vh)] 2xl:h-[min(500px,62vh)] min-h-[320px]">
        <div className="rounded-[2rem] overflow-hidden row-span-2 relative"><img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900&auto=format&fit=crop" alt="Colorful local fashion"/><div className="absolute bottom-4 left-4 right-4 rounded-2xl p-4 backdrop-blur bg-white/90"><b className="font-display text-lg">A little more local</b><p className="text-xs text-stone-600">Thoughtful finds from verified sellers</p></div></div>
        <div className="rounded-[2rem] overflow-hidden relative"><img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=700&auto=format&fit=crop" alt="Bright modern home"/><span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1.5 text-xs"><IcHome size={12}/> Homes to rent</span></div>
        <div className="rounded-[2rem] overflow-hidden relative"><img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=700&auto=format&fit=crop" alt="Professional electrician at work"/><span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1.5 text-xs"><IcWrench size={12}/> Trusted services</span></div>
      </div>
    </section>

    <section className="max-w-7xl mx-auto px-5 md:px-10 py-14 md:py-16"><div className="mb-7"><p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--primary)" }}>Start exploring</p><h2 className="font-display text-3xl md:text-4xl">What are you looking for?</h2></div><div className="grid md:grid-cols-3 gap-4">{[["Products", "Everyday goods with a local touch", <IcShoppingBag/>, "#FBF0E6"], ["Properties", "A place that feels like yours", <IcHome/>, "#EAF2F0"], ["Services", "People who know their craft", <IcWrench/>, "#F1ECF8"]].map(([title, desc, icon, color]) => <button key={String(title)} onClick={() => browse(String(title))} className="text-left p-6 rounded-3xl border hover:-translate-y-1 transition-transform" style={{ background: String(color), borderColor: "var(--border)" }}><span className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center mb-6" style={{ color: "var(--primary)" }}>{icon}</span><b className="font-display text-2xl block">{title}</b><span className="block text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>{desc}</span><span className="inline-flex mt-5 items-center gap-2 text-sm font-semibold" style={{ color: "var(--primary)" }}>Explore {String(title).toLowerCase()} <IcArrowRight size={15}/></span></button>)}</div></section>


  </div>;
}
