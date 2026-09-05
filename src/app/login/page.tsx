import { redirect } from "next/navigation";
import { getUser } from "@/lib/security/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { Providers } from "@/components/shared/Providers";
const Login = async () => {
  if (!process.env.DATABASE_URL) redirect("/settings");
  if (await getUser()) redirect("/dashboard");
  return (
    <Providers configured={false} name="" email="">
      <LoginForm />
    </Providers>
  );
};
export default Login;
