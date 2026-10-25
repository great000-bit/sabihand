import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/legal";
import { COMMISSION_BPS } from "@/lib/money";

export const metadata: Metadata = { title: "Terms of use | Sabihand" };

export default function TermsPage() {
  const pct = COMMISSION_BPS / 100;
  return (
    <LegalPage title="Terms of use" intro="Sabihand helps people in Port Harcourt find a verified artisan, agree a price, and pay safely. By creating an account you agree to these terms.">
      <Section title="What Sabihand is">
        <p>Sabihand is a marketplace. We introduce customers to independent artisans (plumbers, electricians, tailors, carpenters and more) and hold the payment until the job is done. The artisan is not our employee and does the work on their own account.</p>
      </Section>
      <Section title="Where Sabihand works">
        <p>For now Sabihand is open in Port Harcourt, Rivers State. Artisans can list only areas in and around Port Harcourt, and requests can only be made for those areas. We will announce new cities in the app.</p>
      </Section>
      <Section title="Your account">
        <p>You must be 18 or older. Give us true details and keep your password private. You are responsible for what happens under your account.</p>
        <p>One person can be both a customer and an artisan, with one artisan profile each.</p>
      </Section>
      <Section title="How a job works">
        <ol className="list-decimal space-y-1 pl-5">
          <li>The customer sends a request to an artisan.</li>
          <li>The artisan replies with a price. The customer can accept it or walk away.</li>
          <li>The customer pays. We hold the money; the artisan does not receive it yet.</li>
          <li>The artisan does the work. When the customer confirms it is done, we release the money to the artisan, less our fee.</li>
        </ol>
        <p>Agree the price on Sabihand before work starts. A price agreed outside the app is not covered by our payment protection.</p>
      </Section>
      <Section title="Our fee">
        <p>Sabihand keeps {pct}% of the agreed job price from the artisan&apos;s payout. Customers pay the price on the quote and no hidden extras. We will tell users before this fee changes, and a change never applies to a job that is already paid.</p>
      </Section>
      <Section title="Payments">
        <p>Card and bank payments are handled by our payment partner. Sabihand does not store card numbers. Artisans are paid to the bank account they save in their dashboard, so check the account name carefully. We are not responsible for a payout sent to an account the artisan entered wrongly.</p>
      </Section>
      <Section title="Cancelling and refunds">
        <p>A customer can cancel before the artisan starts work. A payment that is held when a job is cancelled is refunded. If something goes wrong after work starts, use the problem process in our <Link href="/disputes" className="font-bold text-link">dispute policy</Link>.</p>
      </Section>
      <Section title="Verification">
        <p>A &quot;Verified&quot; badge means our team looked at the checks shown on the artisan&apos;s profile. It is not a guarantee of the quality of any job. Always read reviews and agree the details before you pay.</p>
      </Section>
      <Section title="Rules for everyone">
        <ul className="list-disc space-y-1 pl-5">
          <li>Do not post false, abusive or unlawful content, or fake reviews.</li>
          <li>Only upload photos you own or have the right to share. Do not upload other people&apos;s faces or private documents without permission.</li>
          <li>Do not use Sabihand to take payment off the platform for a job that started here.</li>
          <li>Do not harass other users or try to break into the service.</li>
        </ul>
        <p>We can hide content, suspend or remove an account, and hold a payout while we look into a report, when these rules are broken.</p>
      </Section>
      <Section title="Our responsibility">
        <p>We work to keep Sabihand running and accurate, but we cannot promise it will always be available or error free. We are not responsible for the quality, safety or timing of work done by an artisan, or for losses we could not reasonably have prevented, beyond what the law requires us to cover. Nothing here removes rights you have under Nigerian consumer law.</p>
      </Section>
      <Section title="Your information">
        <p>How we use your details is in our <Link href="/privacy" className="font-bold text-link">privacy policy</Link>.</p>
      </Section>
      <Section title="Changes and contact">
        <p>We may update these terms. If a change matters, we will tell you in the app before it starts. Questions: see the contact address at the top of this page.</p>
      </Section>
    </LegalPage>
  );
}
