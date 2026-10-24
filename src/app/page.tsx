import Image from "next/image";
import Link from "next/link";
import { SearchForm } from "@/components/search-form";
import { LiveStrip } from "@/components/live-strip";
import { CITIES, CITY_STATE, TRADES } from "@/lib/catalog";
import { Card, Eyebrow, LinkButton } from "@/components/ui";

const STEPS = [
  ["Find", "Choose a trade and your area. See artisans who work near you, with their price range and verification."],
  ["Request", "Describe the job. The artisan replies with a written quote you can accept or ignore."],
  ["Pay into a hold", "Your payment is held by Sabihand. The artisan sees it is secured and starts work."],
  ["Confirm", "When the job is done, you confirm and the payment is released. Not happy? Report a problem first."],
];

const TRADE_ICON: Record<string, string> = { plumbing: "M12 3v9m0 0a3 3 0 1 0 3 3M12 12H7", electrical: "M13 2 4 14h7l-1 8 9-12h-7z", tailoring: "M4 20 20 4M7 4l3 3m7 10 3 3M5 7a2 2 0 1 0 0 .01M17 17a2 2 0 1 0 0 .01", carpentry: "M3 21l9-9m0 0 3-8 6 6-8 3m-1 2-2-2" };

export default function Home() {
  return (
    <div className="space-y-20">
      <section className="grid-tex relative overflow-hidden rounded-[2.25rem] bg-midnight px-6 pb-10 pt-12 text-white sm:px-14 sm:pb-14 sm:pt-20">
        <Image src="/brand/hand-gold.svg" alt="" width={371} height={485} unoptimized aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-[135%] w-auto opacity-[0.14]" />
        <div className="relative max-w-4xl">
          <Eyebrow>{CITIES.join(" · ")}</Eyebrow>
          <h1 className="text-5xl font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
            Trusted hands, <span className="text-gold">near you.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-[#c9d4ee] sm:text-xl">
            Find a verified plumber, electrician, tailor or carpenter, know the price before work starts, and pay into a hold that is released only when you confirm the job.
          </p>
        </div>
        <div className="relative mt-10 max-w-4xl">
          <SearchForm />
          <LiveStrip />
        </div>
      </section>

      <section>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow tone="blue">Trades</Eyebrow>
            <h2 className="text-4xl font-extrabold">What do you need done?</h2>
          </div>
          <Link href="/artisans" className="font-bold text-trust">Browse all artisans →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRADES.map((t) => (
            <Link key={t.id} href={`/artisans?trade=${t.id}`} className="group">
              <Card className="h-full p-7 transition group-hover:-translate-y-0.5 group-hover:border-midnight group-hover:shadow-lg">
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-midnight text-gold">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={TRADE_ICON[t.id]} />
                  </svg>
                </span>
                <p className="font-display text-2xl font-extrabold">{t.plural}</p>
                <p className="mt-2 text-slate">{t.blurb}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-[2.25rem] border-2 border-line bg-white p-8 sm:p-14">
        <Eyebrow tone="blue">How it works</Eyebrow>
        <h2 className="max-w-2xl text-4xl font-extrabold">The price is agreed before the work, and the money waits for you.</h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="relative">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-trust font-display text-xl font-extrabold text-white">{i + 1}</span>
              <h3 className="text-xl font-extrabold">{t}</h3>
              <p className="mt-1.5 text-slate">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[2rem] border-2 border-line bg-white p-8">
          <span className="mb-4 inline-flex h-10 items-center rounded-full bg-verified-soft px-4 text-sm font-extrabold text-verified">✓ Verified</span>
          <h3 className="text-2xl font-extrabold">Verified, and we say how</h3>
          <p className="mt-2 text-slate">Each profile lists exactly which checks the Sabihand team performed: phone, ID, address, guarantor. A badge never appears without at least one.</p>
        </div>
        <div className="rounded-[2rem] bg-gold p-8 text-midnight">
          <span className="mb-4 inline-flex h-10 items-center rounded-full bg-midnight px-4 text-sm font-extrabold text-gold">₦ Clear pricing</span>
          <h3 className="text-2xl font-extrabold">A range, then a written quote</h3>
          <p className="mt-2 opacity-90">Every service shows a typical range. You get an exact quote to accept before any money moves, and changes need both sides to agree again.</p>
        </div>
        <div className="rounded-[2rem] bg-midnight p-8 text-white">
          <span className="mb-4 inline-flex h-10 items-center rounded-full bg-white/10 px-4 text-sm font-extrabold text-gold">Protected</span>
          <h3 className="text-2xl font-extrabold">Paid only when it is done</h3>
          <p className="mt-2 text-[#c9d4ee]">Your payment is held until you confirm the job. If something goes wrong, report it and the Sabihand team steps in before any money is released.</p>
        </div>
      </section>

      <section>
        <Eyebrow tone="blue">Where we work</Eyebrow>
        <h2 className="mb-8 text-4xl font-extrabold">Three cities, then all of Nigeria.</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {CITIES.map((c) => (
            <Link key={c} href={`/artisans?area=city:${encodeURIComponent(c)}`} className="group">
              <Card className="p-7 transition group-hover:border-midnight group-hover:shadow-lg">
                <p className="font-display text-3xl font-extrabold">{c}</p>
                <p className="text-slate">{CITY_STATE[c]}</p>
                <p className="mt-4 font-bold text-trust">See artisans in {c} →</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid-tex relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-[2.25rem] bg-midnight p-8 text-white sm:flex-row sm:items-center sm:p-14">
        <div className="max-w-xl">
          <Eyebrow>For artisans</Eyebrow>
          <h2 className="text-4xl font-extrabold">Plumber, electrician, tailor or carpenter?</h2>
          <p className="mt-3 text-lg text-[#c9d4ee]">Create a free profile, show your prices and get requests from people near you. You pay a commission only when a job is completed.</p>
        </div>
        <LinkButton href="/artisan/join" variant="gold" className="!min-h-12 !px-8 !text-base">Create your profile</LinkButton>
      </section>
    </div>
  );
}
