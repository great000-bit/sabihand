import Link from "next/link";
import { areaLabel, tradeById } from "@/lib/catalog";
import { formatNaira } from "@/lib/money";
import type { Booking } from "@/lib/types";
import { StatusPill } from "./ui";
import { Lift } from "./motion";
import { TRADE_GRADIENT } from "./artisan-card";

export function BookingRow({ b, artisanName, showCustomer = false }: { b: Booking; artisanName: string; showCustomer?: boolean }) {
  const [from, to] = TRADE_GRADIENT[b.trade];
  return (
    <Lift>
      <Link href={`/requests/${b.id}`} className="group block">
        <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-line bg-surface p-4 backdrop-blur-xl transition-colors group-hover:border-white/30 sm:p-5">
          <span aria-hidden className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl font-display text-lg font-extrabold text-white" style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}>
            {tradeById(b.trade).label[0]}
          </span>
          <div className="min-w-0 flex-1 basis-48">
            <h3 className="truncate text-lg font-extrabold">{b.title}</h3>
            <p className="truncate text-sm text-slate">
              {tradeById(b.trade).label} · {showCustomer ? b.customerName : artisanName} · {areaLabel(b.areaId)}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {b.quote && <span className="font-display text-lg font-extrabold">{formatNaira(b.quote.amountKobo)}</span>}
            <StatusPill status={b.status} />
            <span aria-hidden className="text-muted transition-transform group-hover:translate-x-0.5">→</span>
          </div>
        </div>
      </Link>
    </Lift>
  );
}
