"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              V
            </div>
            <span className="text-xl font-semibold">Voice Dialer</span>
          </Link>
          {session && (
            <div className="hidden md:flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost">Dialer</Button>
              </Link>
              {session.user.role === "admin" && (
                <Link href="/admin/users">
                  <Button variant="ghost">Users</Button>
                </Link>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          {session ? (
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {session.user.name?.[0]?.toUpperCase() || session.user.email[0].toUpperCase()}
                </div>
                <span className="hidden sm:inline">{session.user.name || session.user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{session.user.name || "User"}</p>
                  <p className="text-xs text-muted-foreground">{session.user.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{session.user.role}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
