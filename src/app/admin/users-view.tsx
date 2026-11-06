"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listUsers, userDetail, type UserDetail, type UserEvent, type UserRow } from "@/server/admin-users";
import { tradeById } from "@/lib/catalog";
import { BackLink, Box, BoxHead, Quiet, Segmented, ago } from "./parts";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });
const stamp = (iso: string) => new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });
const naira = (kobo: number) => `₦${Math.round(kobo / 100).toLocaleString("en-NG")}`;

function Face({ u, size = 34 }: { u: Pick<UserRow, "name" | "image">; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (u.image && !broken)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={u.image} alt="" width={size} height={size} onError={() => setBroken(true)} referrerPolicy="no-referrer" className="flex-none rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <span className="flex flex-none items-center justify-center rounded-full bg-gold font-bold text-midnight" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {u.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Pill({ tone, children }: { tone: "gold" | "green" | "muted" | "red" | "blue"; children: React.ReactNode }) {
  const c = {
    gold: "bg-gold/15 text-gold",
    green: "bg-verified/20 text-[#5fd39b]",
    muted: "bg-white/[0.06] text-slate",
    red: "bg-alert/20 text-[#ff8a7e]",
    blue: "bg-trust/25 text-[#8fb0ff]",
  }[tone];
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${c}`}>{children}</span>;
}

function RoleTags({ u }: { u: UserRow }) {
  return (
    <span className="flex flex-wrap gap-1">
      {u.admin && <Pill tone="gold">{u.admin === "super" ? "Super admin" : "Admin"}</Pill>}
      {u.role === "artisan" ? <Pill tone="blue">Artisan</Pill> : <Pill tone="muted">Customer</Pill>}
    </span>
  );
}

function useUsers() {
  const [data, setData] = useState<{ error: string | null; users: UserRow[]; at: number } | null>(null);
  useEffect(() => {
    let live = true;
    listUsers()
      .then((r) => live && setData({ ...r, at: Date.now() }))
      .catch(() => live && setData({ error: "Could not load the accounts.", users: [], at: Date.now() }));
    return () => {
      live = false;
    };
  }, []);
  return data;
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Box className="px-5 py-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate">{sub}</p>}
    </Box>
  );
}

type Show = "all" | "customer" | "artisan" | "admin";

/** Every account: who they are, when they joined, and what they have done. */
export function UserList() {
  const data = useUsers();
  const [show, setShow] = useState<Show>("all");
  const [q, setQ] = useState("");
  const users = useMemo(() => data?.users ?? [], [data]);
  if (!data) return <Quiet>Loading accounts…</Quiet>;
  if (data.error) return <Quiet>{data.error}</Quiet>;

  const weekAgo = new Date(data.at - 7 * 864e5).toISOString();
  const has = (u: UserRow, k: Show) => k === "all" || (k === "admin" ? Boolean(u.admin) : u.role === k);
  const needle = q.trim().toLowerCase();
  const rows = users.filter((u) => has(u, show) && (!needle || `${u.name} ${u.email} ${u.artisan?.business ?? ""}`.toLowerCase().includes(needle)));
  const active = users.filter((u) => u.lastSeen && u.lastSeen > weekAgo).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Accounts" value={users.length} sub={`${users.filter((u) => u.createdAt > weekAgo).length} new this week`} />
        <Stat label="Active this week" value={active} sub="Used their sign-in in the last 7 days" />
        <Stat label="Customers" value={users.filter((u) => u.role === "customer").length} sub={`${users.filter((u) => u.bookings > 0).length} have made a request`} />
        <Stat label="Artisans" value={users.filter((u) => u.role === "artisan").length} sub={`${users.filter((u) => u.artisan?.status === "verified").length} verified`} />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          value={show}
          onChange={setShow}
          options={(["all", "customer", "artisan", "admin"] as const).map((k) => [k, `${{ all: "All", customer: "Customers", artisan: "Artisans", admin: "Admins" }[k]} (${users.filter((u) => has(u, k)).length})`])}
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email"
          aria-label="Search accounts"
          className="h-10 w-full rounded-full border border-white/[0.08] bg-[#111215] px-4 text-sm outline-none placeholder:text-muted focus:border-gold/50 sm:w-72"
        />
      </div>
      {rows.length === 0 ? (
        <Quiet>No accounts match.</Quiet>
      ) : (
        <Box className="overflow-x-auto px-2 py-2">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="text-xs text-muted">
                <th className="px-3 py-2 font-medium">Person</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Joined</th>
                <th className="px-3 py-2 font-medium">Last active</th>
                <th className="px-3 py-2 font-medium">Signs in with</th>
                <th className="px-3 py-2 text-right font-medium">Activity</th>
                <th className="px-3 py-2 text-right font-medium">Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-white/[0.06] hover:bg-white/[0.03]">
                  <td className="px-3 py-2.5">
                    <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 hover:text-gold">
                      <Face u={u} />
                      <span className="min-w-0">
                        <span className="block max-w-[220px] truncate font-semibold">{u.name}</span>
                        <span className="block max-w-[220px] truncate text-xs text-muted">{u.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5"><RoleTags u={u} /></td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span className="block">{day(u.createdAt)}</span>
                    <span className="block text-xs text-muted">{ago(u.createdAt)}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate">{u.lastSeen ? ago(u.lastSeen) : "Never"}</td>
                  <td className="px-3 py-2.5 capitalize text-slate">{u.signIn.join(", ") || "-"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-slate">
                    {u.role === "artisan" ? `${u.jobs} job${u.jobs === 1 ? "" : "s"}` : `${u.bookings} request${u.bookings === 1 ? "" : "s"}`}
                    <span className="text-muted"> · {u.messages} msg</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    {u.banned ? <Pill tone="red">Banned</Pill> : u.verified ? <Pill tone="green">Verified</Pill> : <Pill tone="muted">Not verified</Pill>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}
    </div>
  );
}

const DOT: Record<UserEvent["kind"], string> = {
  joined: "bg-gold",
  signin: "bg-white/40",
  artisan: "bg-trust",
  booking: "bg-gold",
  job: "bg-trust",
  payment: "bg-verified",
  review: "bg-gold",
  message: "bg-white/40",
  admin: "bg-alert",
};

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

/** One account in full: details, money, sign-ins and a timeline of what they did. */
export function UserDetailView({ id }: { id: string }) {
  const [data, setData] = useState<{ error: string | null; detail: UserDetail | null } | null>(null);
  const [allEvents, setAllEvents] = useState(false);
  useEffect(() => {
    let live = true;
    userDetail(id).then((r) => live && setData(r)).catch(() => live && setData({ error: "Could not load this account.", detail: null }));
    return () => {
      live = false;
    };
  }, [id]);
  if (!data) return <><BackLink href="/admin/users">All users</BackLink><Quiet>Loading…</Quiet></>;
  if (!data.detail) return <><BackLink href="/admin/users">All users</BackLink><Quiet>{data.error}</Quiet></>;
  const { user: u, sessions, events } = data.detail;
  const shown = allEvents ? events : events.slice(0, 25);

  return (
    <div>
      <BackLink href="/admin/users">All users</BackLink>
      <Box className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <Face u={u} size={64} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-extrabold">{u.name}</h2>
          <p className="truncate text-sm text-slate">{u.email}</p>
          <div className="mt-2"><RoleTags u={u} /></div>
        </div>
        {u.artisan && (
          <Link href={`/admin/artisans/${u.artisan.id}`} className="inline-flex h-10 items-center justify-center rounded-full bg-white px-4 text-sm font-bold text-midnight hover:brightness-95">
            Open artisan profile
          </Link>
        )}
      </Box>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Joined" value={day(u.createdAt)} sub={ago(u.createdAt)} />
        <Stat label="Last active" value={u.lastSeen ? ago(u.lastSeen) : "Never"} sub={`${u.sessions} sign-in${u.sessions === 1 ? "" : "s"} recorded`} />
        {u.role === "artisan" ? (
          <Stat label="Jobs received" value={u.jobs} sub={`${naira(u.earnedKobo)} released to them`} />
        ) : (
          <Stat label="Requests made" value={u.bookings} sub={`${naira(u.spentKobo)} paid in`} />
        )}
        <Stat label="Chat messages" value={u.messages} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <Box className="pb-5">
            <BoxHead title="Details" />
            <dl className="mt-3 grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 px-5 text-sm">
              <Fact label="Name">{u.name}</Fact>
              <Fact label="Email">{u.email}</Fact>
              <Fact label="Email check">{u.verified ? "Verified" : "Not verified"}</Fact>
              <Fact label="Signs in with"><span className="capitalize">{u.signIn.join(", ") || "-"}</span></Fact>
              <Fact label="Account created">{stamp(u.createdAt)}</Fact>
              <Fact label="Role">{u.role === "artisan" ? "Artisan" : "Customer"}{u.admin ? ` and ${u.admin === "super" ? "super admin" : "admin"}` : ""}</Fact>
              {u.artisan && (
                <>
                  <Fact label="Business">{u.artisan.business}</Fact>
                  <Fact label="Trade">{tradeById(u.artisan.trade as never)?.label ?? u.artisan.trade}</Fact>
                  <Fact label="Verification"><span className="capitalize">{u.artisan.status}</span></Fact>
                </>
              )}
              {u.banned && <Fact label="Status"><Pill tone="red">Banned</Pill></Fact>}
              <Fact label="Account id"><span className="font-mono text-xs text-muted">{u.id}</span></Fact>
            </dl>
          </Box>
          <Box className="pb-3">
            <BoxHead title="Sign-ins" />
            {sessions.length === 0 ? (
              <p className="px-5 pt-3 text-sm text-slate">No sign-ins recorded.</p>
            ) : (
              <ul className="mt-2">
                {sessions.map((s, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 border-t border-white/[0.06] px-5 py-2.5 text-sm first:border-t-0">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{s.device ?? "Unknown device"}</span>
                      <span className="block text-xs text-muted">Signed in {stamp(s.createdAt)}{s.ip ? ` · ${s.ip}` : ""}</span>
                    </span>
                    <span className="flex-none text-right text-xs">
                      {s.active ? <Pill tone="green">Open</Pill> : <Pill tone="muted">Ended</Pill>}
                      <span className="mt-1 block text-muted">last used {ago(s.lastSeen)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Box>
        </div>
        <Box className="pb-4">
          <BoxHead title="Activity">
            <span className="text-xs text-muted">{events.length} events</span>
          </BoxHead>
          <ol className="mt-3 px-5">
            {shown.map((e, i) => (
              <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                {i < shown.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-white/[0.08]" aria-hidden />}
                <span className={`mt-1.5 h-[11px] w-[11px] flex-none rounded-full ${DOT[e.kind]}`} aria-hidden />
                <span className="min-w-0 flex-1 text-sm">
                  {e.href ? <Link href={e.href} className="hover:text-gold">{e.text}</Link> : e.text}
                  <span className="block text-xs text-muted">{stamp(e.at)}</span>
                </span>
              </li>
            ))}
          </ol>
          {events.length > shown.length && (
            <button onClick={() => setAllEvents(true)} className="mx-5 mt-3 text-sm font-bold text-gold hover:underline">Show all {events.length}</button>
          )}
        </Box>
      </div>
    </div>
  );
}
