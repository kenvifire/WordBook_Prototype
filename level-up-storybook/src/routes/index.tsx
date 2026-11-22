import { createFileRoute, Link } from "@tanstack/react-router";
import { ComingSoonBadge } from "@/components/wb/badge";

const TITLE = "WordBook — Learn the words. Then read the story.";
const DESC = "Read famous stories retold for your English level, from A2 to C1. Learn the new words first, then enjoy the story.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const nav = [
  { href: "#how", label: "How it works" },
  { href: "#levels", label: "Levels" },
  { href: "#stories", label: "Stories" },
  { href: "#faq", label: "Questions" },
];

function Index() {
  return (
    <div className="overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <a href="#top" className="flex items-center gap-2 font-display text-2xl font-extrabold">
            <span className="inline-block h-6 w-6 rotate-12 rounded-md border-2 border-ink bg-lemon" />
            WordBook
          </a>
          <nav className="hidden gap-6 font-semibold md:flex">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-lemon">{n.label}</a>
            ))}
          </nav>
          <Link to="/signin" className="btn-ink !px-4 !py-2 text-sm">Start reading</Link>
        </div>
      </header>

      {/* HERO */}
      <section id="top" className="grain">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-2 md:py-24">
          <div className="relative z-10">
            <span className="inline-block rounded-full border-2 border-ink bg-lime px-3 py-1 text-sm font-bold">
              Stories for A2 – C1 learners
            </span>
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.02] md:text-7xl">
              Learn the words.<br />
              <span className="text-lemon">Then read the story.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">
              Great stories, told again in easy English. Pick your level. Learn a few new words. Then read and enjoy.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/signin" className="btn-ink">Start reading →</Link>
              <a href="#how" className="btn-ghost">See how it works</a>
            </div>
          </div>
          <HeroArt />
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="scroll-mt-20 border-y-2 border-ink bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-4xl font-extrabold md:text-5xl">Three easy steps</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { n: "1", t: "Choose your level", d: "Take a short level test (A2 to C1). We do the rest.", c: "bg-lime" },
              { n: "2", t: "Learn the words", d: "See 8–10 new words before you read. Each word has a picture and an example.", c: "bg-lemon" },
              { n: "3", t: "Read the story", d: "Now read. You know the words, so the story feels easy and fun.", c: "bg-aqua" },
            ].map((s) => (
              <div key={s.n} className="card-block grain bg-card p-6 text-ink" style={{ boxShadow: "5px 5px 0 0 var(--lime)" }}>
                <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink font-display text-2xl font-extrabold ${s.c}`}>{s.n}</div>
                <h3 className="mt-4 text-2xl font-bold">{s.t}</h3>
                <p className="mt-2 text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LEVELS */}
      <section id="levels" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-4xl font-extrabold md:text-5xl">One story. Four levels.</h2>
          <p className="mt-3 max-w-xl text-lg text-muted-foreground">The same story, told in different ways. Here is one sentence at each level.</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { l: "A2", c: "bg-lime text-ink", s: "The cat was very hungry. It looked at the fish for a long time." },
              { l: "B1", c: "bg-aqua text-paper", s: "The cat had not eaten all day, so it watched the fish very closely." },
              { l: "B2", c: "bg-lemon text-paper", s: "Starving and patient, the cat waited, its eyes fixed on the silver fish." },
              { l: "C1", c: "bg-mint text-ink", s: "Ravenous yet unhurried, the cat kept its gaze trained on the glinting fish." },
            ].map((x, i) => (
              <div key={x.l} className="card-block grain bg-card p-5" style={{ transform: `rotate(${[-1, 1, -1, 1][i]}deg)` }}>
                <span className={`inline-block rounded-full border-2 border-ink px-3 py-0.5 font-display text-xl font-extrabold ${x.c}`}>{x.l}</span>
                <p className="mt-4 font-display text-xl leading-snug">“{x.s}”</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STORIES */}
      <section id="stories" className="grain scroll-mt-20 border-y-2 border-ink bg-lime">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 md:grid-cols-2">
          <div className="relative z-10">
            <h2 className="text-4xl font-extrabold md:text-5xl">Words first. No surprise.</h2>
            <p className="mt-4 text-lg">Before each story, you meet the hard words. Tap a word to see what it means. Listening is coming soon. <ComingSoonBadge /> When you read, you already know it.</p>
            <ul className="mt-6 space-y-2 font-semibold">
              <li>● Classic tales and new stories</li>
              <li>● Short chapters, 5–10 minutes</li>
              <li className="flex flex-wrap items-center gap-2">● Listen while you read <ComingSoonBadge /></li>
            </ul>
          </div>
          <div className="card-block relative z-10 bg-card p-6">
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Today's words · B1</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["forest", "lantern", "whisper", "brave", "secret", "door"].map((w, i) => (
                <span key={w} className={`rounded-full border-2 border-ink px-3 py-1 font-semibold ${["bg-mint", "bg-lime", "bg-aqua text-paper"][i % 3]}`}>{w}</span>
              ))}
            </div>
            <p className="mt-6 font-display text-lg leading-relaxed">
              Mia walks into the dark <b className="text-lemon">forest</b>. She holds a small <b className="text-lemon">lantern</b>. Then she hears a <b className="text-lemon">whisper</b>…
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20">
        <div className="mx-auto max-w-3xl px-5 py-20">
          <h2 className="text-4xl font-extrabold md:text-5xl">Questions</h2>
          <div className="mt-8 space-y-4">
            {[
              ["Is WordBook for me?", "Yes, if you are learning English and your level is between A2 and C1."],
              ["I don't know my level.", "No problem. Read a short text and we will find your level for you."],
              ["Can I use it on my phone?", "Yes. WordBook works on phones, tablets and computers."],
              ["How long is a story?", "Most chapters take 5 to 10 minutes to read."],
            ].map(([q, a]) => (
              <details key={q} className="card-block group bg-card p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-display text-xl font-bold">
                  {q}<span className="transition group-open:rotate-45 text-lemon">+</span>
                </summary>
                <p className="mt-3 text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="grain border-t-2 border-ink bg-lemon text-primary-foreground">
        <div className="relative z-10 mx-auto max-w-4xl px-5 py-20 text-center">
          <h2 className="text-4xl font-extrabold md:text-6xl">Your next story is waiting.</h2>
          <p className="mt-4 text-lg">Free to try. Start in one minute.</p>
          <Link to="/signin" className="btn-ink mt-8 !bg-lime !text-ink">Start reading →</Link>
        </div>
      </section>

      <footer className="bg-ink py-8 text-center text-sm text-paper">
        © 2026 WordBook · Learn the words. Then read the story. · v1.0.1
      </footer>
    </div>
  );
}

/* Flat geometric reader with risograph glows */
function HeroArt() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      <div className="riso-glow absolute inset-0 opacity-80" />
      <svg viewBox="0 0 400 400" className="relative z-0 h-full w-full" aria-label="A curious reader with a floating book">
        <defs>
          <filter id="riso" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n" />
            <feColorMatrix in="n" type="saturate" values="0" result="g" />
            <feComponentTransfer in="g" result="d"><feFuncA type="discrete" tableValues="0 1" /></feComponentTransfer>
            <feComposite in="SourceGraphic" in2="d" operator="in" />
          </filter>
          <radialGradient id="cloud"><stop offset="0" stopColor="var(--mint)" /><stop offset="1" stopColor="var(--mint)" stopOpacity="0" /></radialGradient>
        </defs>
        {/* sun + clouds */}
        <circle cx="300" cy="90" r="55" fill="var(--lime)" />
        <ellipse cx="110" cy="110" rx="90" ry="40" fill="url(#cloud)" filter="url(#riso)" />
        {/* ground */}
        <rect x="20" y="320" width="360" height="22" rx="11" fill="var(--ink)" />
        {/* chair / stack of books */}
        <rect x="70" y="270" width="120" height="24" rx="6" fill="var(--aqua)" stroke="var(--ink)" strokeWidth="3" />
        <rect x="80" y="294" width="110" height="26" rx="6" fill="var(--lemon)" stroke="var(--ink)" strokeWidth="3" />
        {/* legs: long angular */}
        <path d="M150 270 L250 230 L300 318" stroke="var(--ink)" strokeWidth="14" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M120 270 L215 250 L240 318" stroke="var(--ink)" strokeWidth="14" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <polygon points="290,318 330,318 300,306" fill="var(--lemon)" />
        <polygon points="230,318 268,318 240,306" fill="var(--lemon)" />
        {/* body: triangle */}
        <polygon points="100,272 170,272 140,150" fill="var(--lemon)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
        {/* arms long */}
        <path d="M140 185 L205 205 L235 165" stroke="var(--ink)" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* head */}
        <circle cx="140" cy="122" r="32" fill="var(--mint)" stroke="var(--ink)" strokeWidth="3" />
        <path d="M108 112 Q140 70 172 112 L160 100 L140 108 Z" fill="var(--ink)" />
        <circle cx="150" cy="124" r="3.5" fill="var(--ink)" />
        <circle cx="164" cy="122" r="3.5" fill="var(--ink)" />
        <path d="M152 138 Q160 143 166 136" stroke="var(--ink)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* shadow stipple */}
        <ellipse cx="200" cy="320" rx="120" ry="14" fill="var(--ink)" opacity="0.5" filter="url(#riso)" />
        {/* floating book */}
        <g className="animate-float" style={{ transformOrigin: "260px 150px" }}>
          <path d="M215 160 L260 145 L305 160 L305 115 L260 100 L215 115 Z" fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
          <line x1="260" y1="100" x2="260" y2="145" stroke="var(--ink)" strokeWidth="3" />
          <path d="M228 122 L250 115 M228 132 L250 125 M270 115 L292 122 M270 125 L292 132" stroke="var(--aqua)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="235" cy="75" r="7" fill="var(--lime)" stroke="var(--ink)" strokeWidth="2" />
          <polygon points="285,70 293,84 277,84" fill="var(--aqua)" stroke="var(--ink)" strokeWidth="2" />
          <rect x="300" y="78" width="14" height="14" rx="3" fill="var(--lemon)" stroke="var(--ink)" strokeWidth="2" transform="rotate(20 307 85)" />
        </g>
      </svg>
    </div>
  );
}
