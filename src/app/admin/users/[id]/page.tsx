"use client";

import { useParams } from "next/navigation";
import { UserDetailView } from "../../users-view";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <UserDetailView id={id} />;
}
