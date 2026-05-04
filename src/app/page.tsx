import dynamic from "next/dynamic";
import { DrumMachinePageFallback } from "./components/DrumMachineFallback";

const DrumMachine = dynamic(
  () => import("./components/DrumMachine").then((m) => ({ default: m.DrumMachine })),
  { loading: () => <DrumMachinePageFallback /> },
);

export default function Home() {
  return <DrumMachine />;
}
