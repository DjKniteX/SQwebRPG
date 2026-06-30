import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") {
    return (
      <main className="page">
        <section className="panel">
          <h1>Admin Required</h1>
          <p>This dashboard requires an admin account. Seeded admin: admin@example.com / admin123.</p>
        </section>
      </main>
    );
  }
  return <AdminDashboard />;
}
