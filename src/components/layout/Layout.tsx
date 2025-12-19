import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { FloatingHelpButton } from "@/components/ui/floating-help-button";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col public-layout">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <BackToTop />
      <FloatingHelpButton />
    </div>
  );
}
