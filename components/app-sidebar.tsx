"use client"

import {
  ArrowsLeftRightIcon,
  ImagesSquareIcon,
  LockSimpleIcon,
  VideoCameraIcon,
} from "@phosphor-icons/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      aria-label="OpenReformat home"
      className={cn(
        "flex min-w-0 items-center gap-2.5 font-heading font-semibold text-foreground",
        compact ? "text-sm" : "px-2 py-1.5 text-base"
      )}
      href="/"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <ArrowsLeftRightIcon aria-hidden="true" weight="bold" />
      </span>
      <span className="truncate text-xl font-normal tracking-tight">
        OpenReformat
      </span>
    </Link>
  )
}

export function AppSidebar() {
  const { setOpenMobile } = useSidebar()
  const pathname = usePathname()
  const tools = [
    {
      href: "/",
      label: "Image converter",
      agentName: "image-converter",
      icon: ImagesSquareIcon,
    },
    {
      href: "/video",
      label: "Video converter",
      agentName: "video-converter",
      icon: VideoCameraIcon,
    },
  ]

  return (
    <Sidebar collapsible="offcanvas" data-agent-navigation="tools">
      <SidebarHeader className="p-4">
        <Brand />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tools.map((tool) => {
                const Icon = tool.icon
                const isActive =
                  tool.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(tool.href)

                return (
                  <SidebarMenuItem key={tool.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={
                        <Link
                          aria-current={isActive ? "page" : undefined}
                          data-agent-tool={tool.agentName}
                          href={tool.href}
                          onClick={() => setOpenMobile(false)}
                        />
                      }
                      size="lg"
                      tooltip={tool.label}
                    >
                      <Icon aria-hidden="true" weight="fill" />
                      <span>{tool.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3 p-4">
        <div className="flex items-center gap-2 text-xs leading-5 text-sidebar-foreground">
          <LockSimpleIcon aria-hidden="true" className="mt-0.5 shrink-0" />
          <p>
            made by{" "}
            <Link
              className="font-medium text-primary underline underline-offset-2"
              href="https://maty.as"
              target="_blank"
            >
              maty.as
            </Link>
          </p>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
