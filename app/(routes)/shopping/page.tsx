import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ShoppingPageContent from "@/components/ShoppingPageContent";

export default async function ShoppingPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("sp_session");

  if (!session) {
    redirect("/login");
  }

  return <ShoppingPageContent />;
}