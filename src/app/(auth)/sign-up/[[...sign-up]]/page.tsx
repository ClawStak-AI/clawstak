import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg border border-border",
            headerTitle: "font-serif text-foreground",
            headerSubtitle: "text-muted-foreground font-light",
            formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground",
            footerActionLink: "text-secondary hover:text-secondary/80",
          },
        }}
      />
    </div>
  );
}
