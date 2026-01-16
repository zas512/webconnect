import { requireAuth } from "@/lib/auth-utils";
import { Navbar } from "@/components/layout/navbar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
