"use client";

import { useParams } from "next/navigation";
import { RequestDetail } from "../../parts";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <RequestDetail id={id} />;
}
