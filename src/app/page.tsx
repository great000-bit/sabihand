import Link from "next/link";
import { Hero } from "@/components/hero";
import { Marquee } from "@/components/marquee";
import { TradeCard } from "@/components/trade-card";
import { CITIES, CITY_STATE, TRADES } from "@/lib/catalog";
import { Card, Eyebrow, LinkButton } from "@/components/ui";

const STEPS = [
  ["Find", "Choose a trade and your area. See artisans who work near you, with their price range and verification."],
  ["Request", "Describe the job. The artisan replies with a written quote you can accept or ignore."],
  ["Pay into a hold", "Your payment is held by Sabihand. The artisan sees it is secured and starts work."],
  ["Confirm", "When the job is done, you confirm and the payment is released. Not happy? Report a problem first."],
];

export default function Home() {
  return (
    <div className="space-y-20 sm:space-y-28">
      <section className="pt-4 sm:pt-10">
        <Hero />
        <div data-aos="fade-up" data-aos-delay="150" className="relative mt-10 overflow-hidden rounded-[2rem] bg-gradient-to-br from-midnight via-[#16388a] to-trust px-0 pb-8 pt-6 sm:mt-14 sm:rounded-[2.5rem] sm:pb-12 sm:pt-10">
          <Marquee />
          <p className="mt-5 px-4 text-center text-[13px] font-semibold text-white/70 sm:mt-7 sm:text-sm">Plumbers, electricians, tailors and carpenters in {CITIES.join(", ")}</p>
        </div>
      </section>

      <section id="trades">
        <div data-aos="fade-up" className="mb-8 text-center">
          <Eyebrow tone="blue">Trades</Eyebrow>
          <h2 className="text-3xl font-extrabold sm:text-5xl">Pick the job, we find the hands.</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {TRADES.map((t, i) => (
            <div key={t.id} data-aos="fade-up" data-aos-delay={i * 80}>
              <TradeCard id={t.id} plural={t.plural} blurb={t.blurb} />
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="rounded-[2rem] border-2 border-line bg-white p-6 sm:rounded-[2.5rem] sm:p-14">
        <div data-aos="fade-up" className="text-center">
          <Eyebrow tone="blue">How it works</Eyebrow>
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold sm:text-5xl">The price is agreed before the work, and the money waits for you.</h2>
        </div>
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} data-aos="fade-up" data-aos-delay={i * 100}>
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-trust font-display text-lg font-extrabold text-white">{i + 1}</span>
              <h3 className="text-xl font-extrabold">{t}</h3>
              <p className="mt-1.5 text-slate">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div data-aos="fade-up" className="rounded-[2rem] border-2 border-line bg-white p-7 sm:p-8">
          <span className="mb-4 inline-flex h-10 items-center rounded-full bg-verified-soft px-4 text-sm font-extrabold text-verified">✓ Verified</span>
          <h3 className="text-2xl font-extrabold">Verified, and we say how</h3>
          <p className="mt-2 text-slate">Each profile lists exactly which checks the Sabihand team performed: phone, ID, address, guarantor. A badge never appears without at least one.</p>
        </div>
        <div data-aos="fade-up" data-aos-delay="100" className="rounded-[2rem] bg-gold p-7 text-midnight sm:p-8">
          <span className="mb-4 inline-flex h-10 items-center rounded-full bg-midnight px-4 text-sm font-extrabold text-gold">₦ Clear pricing</span>
          <h3 className="text-2xl font-extrabold">A range, then a written quote</h3>
          <p className="mt-2 opacity-90">Every service shows a typical range. You get an exact quote to accept before any money moves, and changes need both sides to agree again.</p>
        </div>
        <div data-aos="fade-up" data-aos-delay="200" className="rounded-[2rem] bg-midnight p-7 text-white sm:p-8">
          <span className="mb-4 inline-flex h-10 items-center rounded-full bg-white/10 px-4 text-sm font-extrabold text-gold">Protected</span>
          <h3 className="text-2xl font-extrabold">Paid only when it is done</h3>
          <p className="mt-2 text-[#c9d4ee]">Your payment is held until you confirm the job. If something goes wrong, report it and the Sabihand team steps in before any money is released.</p>
        </div>
      </section>

      <section>
        <div data-aos="fade-up" className="mb-8 text-center">
          <Eyebrow tone="blue">Where we work</Eyebrow>
          <h2 className="text-3xl font-extrabold sm:text-5xl">Three cities, then all of Nigeria.</h2>
        </div>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {CITIES.map((c, i) => (
            <Link key={c} href={`/artisans?area=city:${encodeURIComponent(c)}`} data-aos="fade-up" data-aos-delay={i * 80} className="group">
              <Card className="p-6 transition group-hover:border-midnight group-hover:shadow-lg sm:p-7">
                <p className="font-display text-3xl font-extrabold">{c}</p>
                <p className="text-slate">{CITY_STATE[c]}</p>
                <p className="mt-4 font-bold text-trust">See artisans in {c} →</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section data-aos="fade-up" className="flex flex-col items-start justify-between gap-6 rounded-[2rem] bg-gradient-to-br from-midnight via-[#16388a] to-trust p-7 text-white sm:flex-row sm:items-center sm:rounded-[2.5rem] sm:p-14">
        <div className="max-w-xl">
          <Eyebrow>For artisans</Eyebrow>
          <h2 className="text-3xl font-extrabold sm:text-4xl">Plumber, electrician, tailor or carpenter?</h2>
          <p className="mt-3 text-lg text-[#c9d4ee]">Create a free profile, show your prices and get requests from people near you. You pay a commission only when a job is completed.</p>
        </div>
        <LinkButton href="/artisan/join" variant="gold" className="!min-h-12 !px-8 !text-base">Create your profile</LinkButton>
      </section>
    </div>
  );
}
