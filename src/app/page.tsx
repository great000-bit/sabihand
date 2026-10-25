import Link from "next/link";
import { Hero } from "@/components/hero";
import { FindGraphic, JoinGraphic, ProtectGraphic, QuoteGraphic } from "@/components/motion-graphics";
import { Marquee } from "@/components/marquee";
import { FeatureRow, Ticks } from "@/components/feature-row";
import { LAUNCH_CITIES, STATES } from "@/lib/catalog";
import { Eyebrow, LinkButton } from "@/components/ui";

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
        <div data-aos="fade-up" data-aos-delay="150" className="relative mt-8 sm:mt-12">
          <Marquee />
          <p className="mt-4 px-4 text-center text-[13px] font-semibold text-muted sm:mt-6 sm:text-sm">Plumbers, electricians, tailors and carpenters in every state across Nigeria</p>
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

      <section>
        <div data-aos="fade-up" className="mb-8 text-center">
          <Eyebrow tone="blue">Where we work</Eyebrow>
          <h2 className="text-3xl font-extrabold sm:text-5xl">All of Nigeria, from your own area.</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate">Sabihand covers all {STATES.length - 1} states and the FCT, down to your local government area. Sign in, then tap the pin on the search to let your phone find your area.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {LAUNCH_CITIES.map((c, i) => (
            <Link key={c.stateId} href={`/artisans?area=state:${c.stateId}`} data-aos="fade-up" data-aos-delay={i * 80} className="rounded-full bg-surface px-7 py-4 text-center shadow-[0_10px_30px_-14px_rgba(11,31,75,0.18)] transition hover:-translate-y-1 hover:shadow-lg">
              <span className="block font-display text-xl font-extrabold sm:text-2xl">{c.name}</span>
              <span className="block text-sm text-slate">First artisans signing up</span>
            </Link>
          ))}
          <Link href="/artisans" data-aos="fade-up" data-aos-delay={240} className="rounded-full bg-midnight px-7 py-4 text-center text-white dark:border dark:border-line dark:bg-white/10 dark:backdrop-blur-xl shadow-[0_10px_30px_-14px_rgba(11,31,75,0.4)] transition hover:-translate-y-1 hover:shadow-lg">
            <span className="block font-display text-xl font-extrabold sm:text-2xl">Anywhere else</span>
            <span className="block text-sm text-white/70">Search by state or GPS</span>
          </Link>
        </div>
      </section>

      <FeatureRow
        tone="bg-panel"
        graphic={<JoinGraphic />}
        dark
        small
        flip
        eyebrow="For artisans"
        title="Plumber, electrician, tailor or carpenter?"
        action={<LinkButton href="/artisan/join" variant="gold" className="!min-h-12 !px-8 !text-base">Create your free profile</LinkButton>}
      >
        <p>Show your prices and get requests from people near you. You pay a commission only when a job is completed.</p>
      </FeatureRow>
    </div>
  );
}
