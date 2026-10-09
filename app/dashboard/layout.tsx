import { DashboardFrame } from "@/components/dashboard-frame"

export const metadata = { title: "Desk" }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardFrame>{children}</DashboardFrame>
}
