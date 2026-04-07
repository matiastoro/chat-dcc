"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { ChatInterface } from "./components/ChatInterface";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <ChatInterface />
    </DashboardLayout>
  );
}
