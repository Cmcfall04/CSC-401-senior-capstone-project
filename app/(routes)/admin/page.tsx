import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AccountSettings from "@/components/AccountSettings";

export default async function AdminPage() {
  // Check if user is logged in
  const cookieStore = await cookies();
  const session = cookieStore.get("sp_session");
  
  // Redirect to login if not authenticated
  if (!session) {
    redirect("/login");
  }

  return <AccountSettings />;
}