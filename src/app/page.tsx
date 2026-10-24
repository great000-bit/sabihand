import Image from "next/image";
import { SearchForm } from "@/components/search-form";
import { TRADES } from "@/lib/seed";
import Link from "next/link";
import { Card, LinkButton } from "@/components/ui";

const STEPS = [
  ["Find", "Choose a trade and your area. See artisans who work near you."],
  ["Compare", "Price range, portfolio and what was verified, side by side."],
  ["Book", "Send the job details, get a clear quote, accept it."],
  ["Pay safely", "Payment is held until you confirm the job is done."],
];

export default function Home() {
  return (
    <div className="space-y-14">
      <section className="grid-tex relative overflow-hidden rounded-[2rem] bg-midnight px-6 py-12 text-white sm:px-12 sm:py-16">
        <Image src="/brand/hand-gold.svg" alt="" width={371} height={485} unoptimized aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-[130%] w-auto opacity-[0.12]" />
        <div className="relative max-w-2xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-gold">Lagos, Abuja and Port Harcourt first, then all of Nigeria</p>
          <h1 className="text-5xl font-extrabold leading-[1.02] sm:text-7xl">
            Trusted hands, <span className="text-gold">near you.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[#c9d4ee]">Find a verified artisan, see the price range before you book, and pay safely. The money is held until you confirm the job.</p>
        </div>
        <div className="relative mt-8 max-w-3xl">
          <SearchForm />
        </div>
      </section>

      <section>
        <h2 className="mb-5 text-3xl font-extrabold">What do you need done?</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRADES.map((t) => (
            <Link key={t.id} href={`/artisans?trade=${t.id}`}>
              <Card className="h-full p-6 transition hover:border-midnight">
                <p className="font-display text-2xl font-extrabold">{t.plural}</p>
                <p className="mt-2 text-slate">{t.blurb}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-8 sm:p-12">
        <h2 className="mb-8 text-3xl font-extrabold">How Sabihand works</h2>
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t}>
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-trust font-display text-xl font-extrabold text-white">{i + 1}</span>
              <h3 className="text-xl font-extrabold">{t}</h3>
              <p className="mt-1 text-slate">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Verified, and we say how", "Every profile lists exactly which checks were done. Nothing is labelled verified without one.", "bg-white"],
          ["Price before booking", "A typical range for each job, then a written quote you accept before any money moves.", "bg-gold text-midnight"],
          ["Money has a place", "You pay into a hold. The artisan is paid when you confirm the job.", "bg-midnight text-white"],
        ].map(([t, d, c]) => (
          <div key={t} className={`rounded-3xl border-2 border-transparent p-7 ${c} ${c === "bg-white" ? "border-line" : ""}`}>
            <h3 className="text-2xl font-extrabold">{t}</h3>
            <p className="mt-2 opacity-90">{d}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col items-start justify-between gap-4 rounded-[2rem] border-2 border-line bg-white p-8 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-extrabold">Are you a plumber, electrician, tailor or carpenter?</h2>
          <p className="mt-1 text-slate">Create a profile, show your work and get requests from people near you.</p>
        </div>
        <LinkButton href="/artisan/join" variant="dark">Join as an artisan</LinkButton>
      </section>
    </div>
  );
}
