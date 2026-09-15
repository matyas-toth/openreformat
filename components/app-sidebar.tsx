"use client"

import {
  ArrowsLeftRightIcon,
  ImagesSquareIcon,
  LockSimpleIcon,
  VideoCameraIcon,
} from "@phosphor-icons/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowUpRightStackIcon,
  Edit01Icon,
  Image02Icon,
} from "@hugeicons/core-free-icons"
import { Video02Icon } from "@hugeicons/core-free-icons"

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
        compact ? "text-sm" : "px-0 py-1.5 text-base"
      )}
      href="/"
    >
      <div className="rounded-lg bg-primary p-0.5 pb-1 pl-1 text-white shadow-[inset_0_2px_0_#ffffff11]">
        <HugeiconsIcon icon={ArrowUpRightStackIcon} />
      </div>

      <span className="truncate text-2xl font-normal tracking-tight">
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
      icon: Image02Icon,
    },
    {
      href: "/video",
      label: "Video converter",
      agentName: "video-converter",
      icon: Video02Icon,
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
                      size="default"
                      tooltip={tool.label}
                    >
                      <HugeiconsIcon
                        size={24}

                        strokeWidth={2}
                        icon={Icon}
                        aria-hidden="true"
                      />
                      <span className="">{tool.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3 p-4">
        <div className="flex items-center gap-2 text-sm leading-5 text-sidebar-foreground">
          <HugeiconsIcon icon={Edit01Icon} />
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
