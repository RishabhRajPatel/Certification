import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || "Your Company";

  const { next } = await searchParams;
  return <LoginForm nextPath={next} companyName={companyName} />;
}
