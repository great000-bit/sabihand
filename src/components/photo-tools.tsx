"use client";

import { useRef, useState } from "react";
import * as actions from "@/server/actions";
import { useStore } from "@/lib/store";
import { uploadPhoto } from "@/lib/resize-image";
import { MAX_PORTFOLIO } from "@/lib/engine";
import type { Artisan } from "@/lib/types";
import { imageSrc } from "@/lib/image-src";
import { Avatar } from "./artisan-card";
import { Button, Card, ErrorNote, Field, inputCls } from "./ui";

/** The artisan's own photo tools: a profile photo and a gallery of past work. */
export function ProfilePhotos({ me }: { me: Artisan }) {
  const { act, busy } = useStore();
  const [err, setErr] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [caption, setCaption] = useState("");
  const avatarInput = useRef<HTMLInputElement>(null);
  const workInput = useRef<HTMLInputElement>(null);
  const locked = busy || working;

  async function run(fn: () => Promise<string | null>) {
    setErr(null);
    setWorking(true);
    try {
      setErr(await fn());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-extrabold">Photos</h2>
      <p className="text-slate">A clear face photo and pictures of your finished work help people trust you and choose you.</p>

      <div className="mt-5 flex flex-wrap items-center gap-5">
        <Avatar name={me.name} size={96} trade={me.trade} photoId={me.photoId} />
        <div className="flex flex-wrap gap-2">
          <input
            ref={avatarInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void run(async () => act(async () => actions.setProfilePhoto(me.id, await uploadPhoto(f, { max: 512, square: true }))));
            }}
          />
          <Button variant="dark" disabled={locked} onClick={() => avatarInput.current?.click()}>{working ? "Uploading…" : me.photoId ? "Change profile photo" : "Add profile photo"}</Button>
          {me.photoId && <Button variant="ghost" disabled={locked} onClick={() => void run(() => act(() => actions.removeProfilePhoto(me.id)))}>Remove</Button>}
        </div>
      </div>

      <h3 className="mt-8 text-lg font-extrabold">Your work <span className="text-sm font-semibold text-muted">({me.portfolio.length}/{MAX_PORTFOLIO})</span></h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {me.portfolio.map((p) => (
          <figure key={p.id} className="group relative overflow-hidden rounded-2xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc(p.imageId)} alt={p.caption || "Photo of past work"} className="aspect-square w-full object-cover" loading="lazy" />
            {p.caption && <figcaption className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 text-xs font-semibold text-white">{p.caption}</figcaption>}
            <button aria-label="Remove this photo" disabled={locked} onClick={() => void run(() => act(() => actions.removePortfolioPhoto(me.id, p.id)))} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-sm font-extrabold text-white hover:bg-alert/80">
              ✕
            </button>
          </figure>
        ))}
        {me.portfolio.length === 0 && <p className="col-span-full text-slate">No photos of your work yet.</p>}
      </div>

      {me.portfolio.length < MAX_PORTFOLIO && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1"><Field label="What is in the photo? (optional)"><input value={caption} onChange={(e) => setCaption(e.target.value)} className={inputCls} placeholder="e.g. New kitchen sink fitted" maxLength={120} /></Field></div>
          <input
            ref={workInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f)
                void run(async () => {
                  const r = await act(async () => actions.addPortfolioPhoto(me.id, await uploadPhoto(f, { max: 1280 }), caption));
                  if (!r) setCaption("");
                  return r;
                });
            }}
          />
          <Button disabled={locked} onClick={() => workInput.current?.click()}>{working ? "Uploading…" : "Add a photo of your work"}</Button>
        </div>
      )}
      <div className="mt-3"><ErrorNote message={err} /></div>
    </Card>
  );
}
