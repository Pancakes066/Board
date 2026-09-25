export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-2xl font-semibold tracking-tight text-primary">Board</span>
          <p className="mt-1 text-sm text-muted-foreground">
            Configurez vos revenus et dépenses une fois, votre budget se remplit tout seul.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
