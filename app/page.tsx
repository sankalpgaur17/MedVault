"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const router = useRouter();

  React.useEffect(() => {
    // Redirect to dashboard when landing on home page
    router.push('/dashboard');
  }, [router]);

  return (
    <section className="min-h-screen flex items-center justify-center">
      {/* Optional loading state while redirecting */}
      <div>Redirecting to dashboard...</div>
    </section>
  );
}
