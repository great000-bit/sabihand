"use client";

import { useParams } from "next/navigation";
import { ArtisanDetail } from "../../parts";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <ArtisanDetail id={id} />;
}
