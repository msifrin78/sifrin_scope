import { LoginForm } from "../components/login-form";
import { BookOpenCheck } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center p-8">
      <div className="flex w-full max-w-md flex-col items-center justify-center space-y-6">
        <div className="flex items-center space-x-3 text-primary">
          <BookOpenCheck className="h-8 w-8" />
          <h1 className="text-3xl font-bold text-foreground">
            Sifrin's Scope
          </h1>
        </div>
        <p className="text-center text-muted-foreground">
          Welcome back! Please sign in to manage your classes.
        </p>
        <LoginForm />
        <p className="px-8 text-center text-sm text-muted-foreground">
          By continuing, you are agreeing to our Terms of Service and Privacy
          Policy.
        </p>
      </div>
    </main>
  );
}
