"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Menu, Plus, Wallet } from "lucide-react";
import { useGroups } from "@/store/groups";
import { AvatarBadge } from "@/components/AvatarBadge";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { groups, hydrated } = useGroups();
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Link href="/" className="flex items-center gap-2 px-1 py-1" onClick={onNavigate}>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Wallet className="size-4" />
        </span>
        <span className="font-heading text-base font-semibold tracking-tight">YourSplit</span>
      </Link>

      <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
        <Plus className="size-4" /> New group
      </Button>

      <div className="-mx-1 flex-1 overflow-y-auto px-1">
        <p className="px-2 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Groups
        </p>
        {!hydrated ? (
          <div className="flex flex-col gap-1.5 px-1">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9 rounded-lg" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">No groups yet.</p>
        ) : (
          <nav className="flex flex-col gap-0.5">
            {groups.map((g) => {
              const active = pathname === `/g/${g.id}`;
              return (
                <Link
                  key={g.id}
                  href={`/g/${g.id}`}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <AvatarBadge id={g.id} name={g.name} size="sm" />
                  <span className="truncate">{g.name}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-sidebar-border pt-3">
        <span className="text-xs text-muted-foreground">Theme</span>
        <ModeToggle />
      </div>

      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background print:block print:h-auto print:overflow-visible">
      {/* Sidebar is its own full-height column with its own internal scroll
          (see SidebarContent) — it never scrolls with the center panel. */}
      <aside className="hidden h-full w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block print:hidden">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden print:overflow-visible">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-sm lg:hidden print:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
                <SheetDescription>Groups list and navigation</SheetDescription>
              </SheetHeader>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="font-heading text-base font-semibold">YourSplit</span>
        </header>

        {/* The only scrolling region on the page — sidebar and headers stay put. */}
        <main className="flex-1 overflow-y-auto print:overflow-visible">{children}</main>
      </div>
    </div>
  );
}
