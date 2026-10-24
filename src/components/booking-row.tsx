import Link from "next/link";
import { areaById, tradeById } from "@/lib/catalog";
import { formatNaira } from "@/lib/money";
import type { Booking } from "@/lib/types";
import { Card, StatusPill } from "./ui";

export function BookingRow({ b, artisanName, showCustomer = false }: { b: Booking; artisanName: string; showCustomer?: boolean }) {
  return (
    <Link href={`/requests/${b.id}`} className="group block">
      <Card className="p-5 transition group-hover:border-midnight group-hover:shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold">{b.title}</h3>
            <p className="text-sm text-slate">
              {tradeById(b.trade).label} · {showCustomer ? b.customerName : artisanName} · {areaById(b.areaId)?.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {b.quote && <span className="font-display text-lg font-extrabold">{formatNaira(b.quote.amountKobo)}</span>}
            <StatusPill status={b.status} />
          </div>
        </div>
      </Card>
    </Link>
  );
}
