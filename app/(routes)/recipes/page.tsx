import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import RecipesPage from "@/components/RecipesPage";

export default async function Page() {
  const cookieStore = await cookies();
  const session = cookieStore.get("sp_session");

  if (!session) {
    redirect("/login");
  }

  return <RecipesPage />;
}
