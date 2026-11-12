import { PublikGate } from "@/components/PublikGate";
import { Workspace } from "@/components/Workspace";

// The software opens with Sign in with publik; the landing page at / does not.
export default function AppPage() {
  return (
    <PublikGate appName="Midstance">
      <Workspace />
    </PublikGate>
  );
}
