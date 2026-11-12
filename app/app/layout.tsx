import type { Metadata } from "next";
import { PublikGate } from "@/components/PublikGate";
import { PublikNote } from "@/components/PublikNote";

export const metadata: Metadata = {
  title: "Midstance · app",
};

// The app itself opens with Sign in with publik; the landing page at / does not.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublikGate appName="Midstance" footer={<PublikNote />}>
      {children}
    </PublikGate>
  );
}
