import { Hero } from "@/components/hero";
import { FindGraphic, JoinGraphic, ProtectGraphic, QuoteGraphic } from "@/components/motion-graphics";
import { Marquee } from "@/components/marquee";
import { FeatureRow, Ticks } from "@/components/feature-row";
import { Eyebrow, LinkButton } from "@/components/ui";

const STEPS = [
  ["Find", "You", "Choose a trade and your part of Port Harcourt. See artisans who work near you, with their price range and verification."],
  ["Request", "Together", "Describe the job. The artisan replies with a written quote you can accept or ignore."],
  ["Pay into a hold", "Sabihand", "Your payment is held by Sabihand. The artisan sees it is secured and starts work."],
  ["Confirm", "You", "When the job is done, you confirm and the payment is released. Not happy? Report a problem first."],
];

export default function Home() {
  return (
    <div className="space-y-20 sm:space-y-28">
      <section className="pt-4 sm:pt-10">
        <Hero />
        <div data-aos="fade-up" data-aos-delay="150" className="relative mt-8 sm:mt-12">
          <Marquee />
        </div>
      </section>

      <FeatureRow
        tone="bg-tint-blue"
        graphic={<FindGraphic />}
        eyebrow="Find"
        title="Find a verified artisan near you"
        action={<LinkButton href="/artisans" variant="dark">Find an artisan</LinkButton>}
      >
        <p>Choose your trade and your area, and see who works near you.</p>
        <Ticks items={["Each profile lists the checks the Sabihand team actually did", "Ratings only come from jobs completed on Sabihand", "Verified artisans are always shown first"]} />
      </FeatureRow>

      <FeatureRow
        tone="bg-tint-gold"
        graphic={<QuoteGraphic />}
        flip
        eyebrow="Quote"
        title="Know the price before the work starts"
        action={<LinkButton href="/artisans?trade=tailoring" variant="dark">See a price range</LinkButton>}
      >
        <p>Every service shows a typical range. Send your job, get a written quote, and accept it only if it suits you.</p>
        <Ticks items={["A range up front, an exact quote before any money moves", "Changes to price or scope need both sides to agree again"]} />
      </FeatureRow>

      <FeatureRow
        tone="bg-panel"
        graphic={<ProtectGraphic />}
        dark
        eyebrow="Protected"
        title="Your money waits until the job is done"
        action={<LinkButton href="/#how-it-works" variant="gold">See how it works</LinkButton>}
      >
        <p>You pay into a hold. The artisan starts work knowing the money is secured, and is paid only when you confirm the job.</p>
        <Ticks dark items={["Something wrong? Report it and the Sabihand team steps in", "Nothing is released while a problem is open"]} />
      </FeatureRow>

      <section id="how-it-works" className="px-1 sm:px-6">
        <div data-aos="fade-up" className="text-center">
          <Eyebrow tone="blue">How it works</Eyebrow>
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold sm:text-5xl">The price is agreed before the work, and the money waits for you.</h2>
        </div>
        <ol className="mx-auto mt-12 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, who, d], i) => (
            <li key={t} data-aos="fade-up" data-aos-delay={i * 100} className="grain group relative overflow-hidden rounded-[2rem] border border-line bg-panel p-6 transition duration-300 hover:-translate-y-1 hover:border-gold/50 sm:p-7">
              <div className="relative flex items-start justify-between">
                <span className="font-display text-6xl font-extrabold leading-none text-transparent bg-gradient-to-b from-gold to-gold/10 bg-clip-text">{String(i + 1).padStart(2, "0")}</span>
                <span className="mt-1 whitespace-nowrap rounded-full border border-line px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-muted">{who}</span>
              </div>
              <h3 className="relative mt-8 text-xl font-extrabold">{t}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-slate sm:text-[15px]">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <div data-aos="fade-up" className="grain relative mx-auto grid max-w-6xl gap-8 overflow-hidden rounded-[2.5rem] border border-line bg-panel p-8 sm:p-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-14">
          <div className="relative">
            <Eyebrow tone="blue">Where we work</Eyebrow>
            <h2 className="text-3xl font-extrabold sm:text-5xl">Built for Port Harcourt.</h2>
            <p className="mt-4 max-w-md text-slate">Sabihand is launching in Port Harcourt, Rivers State. Every artisan on the platform works in the city, so help is close and every job gets proper attention.</p>
            <div className="mt-7">
              <LinkButton href="/artisans" variant="gold">Find an artisan</LinkButton>
            </div>
          </div>
          <ul className="relative grid gap-3">
            {[
              ["Rivers State", "Our launch home, and our only focus for now."],
              ["Near you", "Search by your part of the city, or let your phone find it."],
              ["Properly checked", "Each profile lists the checks the Sabihand team actually did."],
            ].map(([t, d]) => (
              <li key={t} className="rounded-3xl border border-line bg-white/[0.03] px-5 py-4">
                <p className="font-display text-lg font-extrabold">{t}</p>
                <p className="mt-0.5 text-sm text-slate">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <FeatureRow
        tone="bg-panel"
        graphic={<JoinGraphic />}
        dark
        small
        flip
        eyebrow="For artisans"
        title="Do you work with your hands in Port Harcourt?"
        action={<LinkButton href="/artisan/join" variant="gold" className="!min-h-12 !px-8 !text-base">Create your free profile</LinkButton>}
      >
        <p>Plumber, electrician, tailor, mechanic, stylist, painter, welder, carpenter, tiler, cleaner or any of our other trades: show your prices and get requests from people near you. You pay a commission only when a job is completed.</p>
      </FeatureRow>
    </div>
  );
}
