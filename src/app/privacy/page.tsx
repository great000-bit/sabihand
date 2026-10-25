import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/legal";

export const metadata: Metadata = { title: "Privacy policy | Sabihand" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" intro="We collect only what we need to connect customers and artisans and to make payments safe. This page says what that is and what you can ask us to do.">
      <Section title="What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-ink">Account:</strong> your name, email address and password (stored scrambled, never in plain text).</li>
          <li><strong className="text-ink">Requests and jobs:</strong> what you ask for, the area, the preferred date, your phone number, quotes, notes on the job, reviews and reports.</li>
          <li><strong className="text-ink">Artisan profiles:</strong> business name, trade, areas served, prices, bio, profile and work photos, and the verification checks our team completed.</li>
          <li><strong className="text-ink">Messages:</strong> the chat between a customer and an artisan on a job.</li>
          <li><strong className="text-ink">Payments:</strong> the amount, status and reference of each payment. Card details go to our payment partner, not to us. Artisans also give a bank account for payouts.</li>
          <li><strong className="text-ink">Location:</strong> only if you press &quot;Use my location&quot;. We use it in your browser to pick the nearest area and do not store your exact position.</li>
        </ul>
      </Section>
      <Section title="Who sees what">
        <p>Artisans see a customer&apos;s name and area for the request that customer sent them, and the customer&apos;s phone number only once the job is paid for. Customers see an artisan&apos;s public profile and get the artisan&apos;s phone number once they have paid. Bank details are private to the artisan and our admin team, and are used only to pay out.</p>
        <p>Job chats are private to the customer and the artisan. Our team reads a chat only when a problem is reported on that job or to stop fraud or abuse.</p>
        <p>Profile photos and work photos are public, so anyone with the link can see them.</p>
      </Section>
      <Section title="How we use it">
        <p>To run bookings and payments, verify artisans, resolve problems, prevent fraud, and send messages about your jobs. We do not sell your personal information.</p>
      </Section>
      <Section title="Who we share it with">
        <p>Only the services that run Sabihand: our payment partner (Paystack), our database and sign-in provider (Neon), and our hosting provider (Vercel). They handle data for us and not for their own use. We may share information if the law requires it or to protect users from fraud or harm.</p>
      </Section>
      <Section title="How long we keep it">
        <p>We keep your account while it is open. We keep records of payments and jobs for as long as the law and our need to settle disputes require. You can ask us to delete your account and profile; some payment records may have to stay.</p>
      </Section>
      <Section title="Your choices">
        <p>You can ask us to see, correct or delete your information, or to stop contacting you, by writing to the address at the top of this page. You can remove your photos from your dashboard at any time. We handle personal data in line with the Nigeria Data Protection Act 2023.</p>
      </Section>
      <Section title="Security">
        <p>We use encrypted connections and limit who can see private information. No service can promise perfect security, so pick a password you do not use elsewhere.</p>
      </Section>
      <Section title="More">
        <p>Our <Link href="/terms" className="font-bold text-link">terms of use</Link> and <Link href="/disputes" className="font-bold text-link">dispute policy</Link> explain the rest. We will tell you in the app if this policy changes in a way that matters.</p>
      </Section>
    </LegalPage>
  );
}
