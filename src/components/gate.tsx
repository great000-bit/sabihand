"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import { Card, LinkButton } from "./ui";

/** Shows the page only to signed-in people; everyone else gets a clear way in that brings them back here. */
export function SignedInOnly({ title = "Sign in to continue", children }: { title?: string; children: ReactNode }) {
  const { viewer, config } = useStore();
  const path = usePathname();
  if (viewer) return <>{children}</>;
  const next = encodeURIComponent(path);
  return (
    <Card className="mx-auto mt-6 max-w-lg p-8 text-center sm:p-10">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <p className="mt-2 text-slate">{config.dataAvailable ? "Your requests, quotes and payments live in your account." : "Sabihand is starting up. Please try again in a moment."}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <LinkButton href={`/auth/sign-in?next=${next}`}>Sign in</LinkButton>
        <LinkButton href={`/auth/sign-up?next=${next}`} variant="ghost">Create an account</LinkButton>
      </div>
    </Card>
  );
}
