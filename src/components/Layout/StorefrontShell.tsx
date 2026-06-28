"use client";



import { usePathname } from "next/navigation";
import { Header } from "@/components/Layout/Header";
import { Footer } from "@/components/Layout/Footer";
import { AuthModal } from "@/components/Forms/AuthModal";
import { ToastContainer } from "@/components/Elements/ToastContainer";



export function StorefrontShell({ children }: { children: React.ReactNode }) {

  const pathname = usePathname();

  const isAdmin = pathname?.startsWith("/admin-portal");



  if (isAdmin) {

    return (

      <>

        {children}

        <ToastContainer />

      </>

    );

  }



  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <AuthModal />
      <ToastContainer />
    </>
  );

}

