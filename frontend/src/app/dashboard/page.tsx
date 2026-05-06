import { Metadata } from "next";
import Dashboard from "./dashboard";

export const metadata: Metadata = {
  title: "Dashboard - Digital Security Logbook",
};

export default function Page() {
  return <Dashboard />;
}
