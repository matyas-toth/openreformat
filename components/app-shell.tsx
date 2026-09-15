"use client"

import { ListIcon } from "@phosphor-icons/react"

import { AppSidebar, Brand } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"

function MobileHeader() {
  const { toggleSidebar } = useSidebar()

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 md:hidden">
      <Button
        aria-label="Open tools menu"
        data-agent-action="open-tools-menu"
        onClick={toggleSidebar}
        size="icon"
        variant="ghost"
      >
        <ListIcon aria-hidden="true" weight="bold" />
      </Button>
      <Brand compact />
    </header>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen data-local-processing="true">
      <AppSidebar />
      <SidebarInset>
        <MobileHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
