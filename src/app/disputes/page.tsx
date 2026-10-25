import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/legal";

export const metadata: Metadata = { title: "Dispute policy | Sabihand" };

export default function DisputesPage() {
  return (
    <LegalPage title="Dispute policy" intro="If a job does not go as agreed, your money is safe while we look into it. This is how a problem is handled.">
      <Section title="Your money is held first">
        <p>When a customer pays, Sabihand holds the money. It is released to the artisan only when the customer confirms the job is done, or when our team decides it should be. Until then it is not spent.</p>
      </Section>
      <Section title="Report a problem">
        <p>Either the customer or the artisan can report a problem on the job page once the booking is paid and before the money is released. A customer can also report a problem on a job already marked done. Say clearly what went wrong, what was agreed, and what you want to happen.</p>
        <p>Reporting a problem pauses the payout. Nothing moves until our team has decided.</p>
      </Section>
      <Section title="What happens next">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Our team reads the booking, the agreed quote and both sides&apos; notes.</li>
          <li>We may ask either side for photos or more detail.</li>
          <li>We decide, record our reasons on the job, and tell both sides.</li>
        </ol>
      </Section>
      <Section title="The possible outcomes">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-ink">Release to the artisan:</strong> the work was done as agreed.</li>
          <li><strong className="text-ink">Refund to the customer:</strong> the work was not done, or was not what was agreed.</li>
        </ul>
        <p>Where the work was only part done, we will talk to both sides and agree a fair split before we decide. Our decision is final inside Sabihand. It does not remove anyone&apos;s right to go to the courts or other authorities.</p>
      </Section>
      <Section title="How to avoid a dispute">
        <ul className="list-disc space-y-1 pl-5">
          <li>Agree the scope and price in the quote before you pay.</li>
          <li>Keep photos of the work before and after.</li>
          <li>Confirm the job only when you are happy with it.</li>
          <li>Keep talking and paying inside Sabihand so we can protect you.</li>
        </ul>
      </Section>
      <Section title="Reviews and fake claims">
        <p>An artisan can report a review they believe is false. Our team checks and may hide it. Bad-faith reports or claims can lead to a warning or removal from Sabihand.</p>
      </Section>
      <Section title="More">
        <p>See also our <Link href="/terms" className="font-bold text-link">terms of use</Link> and <Link href="/privacy" className="font-bold text-link">privacy policy</Link>.</p>
      </Section>
    </LegalPage>
  );
}
