"use client";



import { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import { motion } from "framer-motion";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

import { AdminLogin, clearAdminSession } from "@/components/Admin/AdminLogin";
import { adminAuth } from "@/lib/firebase";

import { AdminDashboard } from "@/components/Admin/AdminDashboard";

import { AdminProducts } from "@/components/Admin/AdminProducts";

import { AdminOrders } from "@/components/Admin/AdminOrders";

import { AdminLogistics } from "@/components/Admin/AdminLogistics";

import { AdminContent } from "@/components/Admin/AdminContent";

import { AdminUsers } from "@/components/Admin/AdminUsers";

import { AdminPromos } from "@/components/Admin/AdminPromos";

import { AdminNewsletter } from "@/components/Admin/AdminNewsletter";

import { SPRING_TRANSITION, GLASS_CLASS } from "@/lib/constants";

import {

  LayoutDashboard,

  Package,

  ClipboardList,

  Truck,

  Settings,

  LogOut,

  Users,

  Tag,

  Mail,

} from "lucide-react";



const tabs = [

  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },

  { id: "products", label: "Products", icon: Package },

  { id: "orders", label: "Orders", icon: ClipboardList },

  { id: "users", label: "Users", icon: Users },

  { id: "promos", label: "Promos", icon: Tag },

  { id: "newsletter", label: "Newsletter", icon: Mail },

  { id: "logistics", label: "Logistics", icon: Truck },

  { id: "content", label: "Content", icon: Settings },

] as const;



type TabId = (typeof tabs)[number]["id"];



export default function AdminPortalPage() {

  const { user, loading, isAdmin, signOut } = useAuth();
  const { showToast } = useToast();

  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  useEffect(() => {
    if (user && isAdmin && adminAuth?.currentUser) {
      adminAuth.currentUser.getIdToken().then((token) =>
        fetch("/api/admin/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token }),
        })
      ).catch(() => {});
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (user && !loading && !isAdmin) {
      showToast("You are not authorized to access the admin portal.", "error");
    }
  }, [user, loading, isAdmin, showToast]);

  if (loading) {
    return (

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-pink to-white">

        <div className={`${GLASS_CLASS} rounded-2xl p-8 animate-pulse`}>

          <p className="text-brand-muted">Verifying admin access...</p>

        </div>

      </div>

    );

  }



  if (!user) {

    return <AdminLogin />;

  }



  if (!isAdmin) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-pink via-brand-pink-accent/40 to-white p-6">

        <div className={`${GLASS_CLASS} rounded-2xl p-8 max-w-md text-center space-y-4`}>

          <p className="text-red-600 font-medium">Access denied</p>

          <p className="text-sm text-brand-muted">

            This account is not authorized for the admin portal. In Firestore, add a document to the{" "}

            <code className="text-xs bg-white/60 px-1 rounded">admins</code> collection using your

            user UID as the document ID (not your email).

          </p>

          {user?.uid && (
            <p className="text-xs text-brand-muted font-mono bg-white/50 rounded-lg px-3 py-2 break-all">
              Your UID: {user.uid}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">

            <button

              onClick={() => router.push("/")}

              className="px-5 py-2.5 rounded-full text-sm font-semibold bg-brand-charcoal text-white"

            >

              Go to Storefront

            </button>

            <button

              onClick={() => signOut()}

              className="px-5 py-2.5 rounded-full text-sm font-semibold border border-brand-pink-accent/50 text-brand-charcoal"

            >

              Sign out

            </button>

          </div>

        </div>

      </div>

    );

  }



  return (

    <div className="min-h-screen bg-gradient-to-br from-brand-pink/40 to-white">

      <div className="flex">

        <aside className={`w-64 min-h-screen ${GLASS_CLASS} border-r border-brand-pink-accent/30 p-6 hidden lg:block`}>

          <h1 className="font-script text-2xl mb-1">Royaale</h1>

          <p className="text-xs font-bold tracking-luxe uppercase mb-8 text-brand-muted">Admin Portal</p>

          <nav className="space-y-1">

            {tabs.map((tab) => (

              <motion.button

                key={tab.id}

                onClick={() => setActiveTab(tab.id)}

                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${

                  activeTab === tab.id

                    ? "bg-brand-charcoal text-white"

                    : "text-brand-charcoal hover:bg-brand-pink-accent/40"

                }`}

                whileHover={{ scale: 1.02, x: 4 }}

                whileTap={{ scale: 0.98 }}

                transition={SPRING_TRANSITION}

              >

                <tab.icon className="w-4 h-4" />

                {tab.label}

              </motion.button>

            ))}

          </nav>

          <button

            onClick={async () => {

              await clearAdminSession();

              await signOut();

              router.refresh();

            }}

            className="flex items-center gap-2 mt-8 text-sm text-brand-muted hover:text-red-500"

          >

            <LogOut className="w-4 h-4" /> Sign Out

          </button>

        </aside>



        <main className="flex-1 p-4 md:p-8">

          <div className="lg:hidden flex gap-2 mb-6 overflow-x-auto pb-2">

            {tabs.map((tab) => (

              <button

                key={tab.id}

                onClick={() => setActiveTab(tab.id)}

                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap ${

                  activeTab === tab.id ? "bg-brand-charcoal text-white" : "bg-brand-pink-accent/50"

                }`}

              >

                {tab.label}

              </button>

            ))}

          </div>



          <motion.div

            initial={{ opacity: 0, y: 10 }}

            animate={{ opacity: 1, y: 0 }}

            transition={SPRING_TRANSITION}

          >

            <div className={activeTab === "dashboard" ? undefined : "hidden"}>

              <AdminDashboard />

            </div>

            <div className={activeTab === "products" ? undefined : "hidden"}>

              <AdminProducts />

            </div>

            <div className={activeTab === "orders" ? undefined : "hidden"}>

              <AdminOrders />

            </div>

            <div className={activeTab === "users" ? undefined : "hidden"}>

              <AdminUsers />

            </div>

            <div className={activeTab === "promos" ? undefined : "hidden"}>

              <AdminPromos />

            </div>

            <div className={activeTab === "newsletter" ? undefined : "hidden"}>

              <AdminNewsletter />

            </div>

            <div className={activeTab === "logistics" ? undefined : "hidden"}>

              <AdminLogistics />

            </div>

            <div className={activeTab === "content" ? undefined : "hidden"}>

              <AdminContent />

            </div>

          </motion.div>

        </main>

      </div>

    </div>

  );

}

