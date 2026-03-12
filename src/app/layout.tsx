/* eslint-disable react-refresh/only-export-components */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Databus Pilot | AI Agent Interface",
  description: "Advanced multi-agent orchestration and chat interface.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
