import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <Image
        src="/auth-bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* The photo is already dark, but this keeps the card readable
          against its brighter (top-left) corner in every viewport. */}
      <div className="absolute inset-0 bg-background/45" />

      <div className="relative w-full max-w-md">
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
