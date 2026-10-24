import { AuthForm } from "@/components/auth-form";
import { signUpWithEmail } from "./actions";

export const metadata = { title: "Create account · Sabihand" };

export default function SignUpPage() {
  return <AuthForm mode="sign-up" action={signUpWithEmail} />;
}
