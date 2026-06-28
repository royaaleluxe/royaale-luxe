"use client";



import { motion, AnimatePresence } from "framer-motion";

import Link from "next/link";

import { X } from "lucide-react";

import { useUI } from "@/context/UIContext";

import { DrawerPortal } from "@/components/Elements/DrawerPortal";

import { SPRING_TRANSITION, OVERLAY_BACKDROP, OVERLAY_PANEL } from "@/lib/constants";



const links = [

  { href: "/", label: "Home" },

  { href: "/new-arrivals", label: "New Arrivals" },

  { href: "/bestsellers", label: "Bestsellers" },

  { href: "/collections", label: "Custom Collections" },

  { href: "/about", label: "About Us" },

  { href: "/contact", label: "Contact" },

];



const container = {

  hidden: { opacity: 0 },

  show: { opacity: 1, transition: { staggerChildren: 0.07 } },

};



const item = {

  hidden: { opacity: 0, x: -20 },

  show: { opacity: 1, x: 0, transition: SPRING_TRANSITION },

};



export function NavDrawer() {

  const { navOpen, setNavOpen } = useUI();



  return (

    <DrawerPortal>

      <AnimatePresence>

        {navOpen && (

          <>

            <motion.div

              className={OVERLAY_BACKDROP}

              initial={{ opacity: 0 }}

              animate={{ opacity: 1 }}

              exit={{ opacity: 0 }}

              onClick={() => setNavOpen(false)}

            />

            <motion.aside

              className={`${OVERLAY_PANEL} left-0 w-80 max-w-[85vw] border-r p-8`}

              initial={{ x: "-100%" }}

              animate={{ x: 0 }}

              exit={{ x: "-100%" }}

              transition={{ type: "spring", stiffness: 300, damping: 30 }}

            >

              <div className="flex justify-between items-center mb-10">

                <span className="font-script text-2xl text-brand-charcoal">Menu</span>

                <motion.button

                  onClick={() => setNavOpen(false)}

                  whileHover={{ scale: 1.1 }}

                  whileTap={{ scale: 0.9 }}

                >

                  <X className="w-6 h-6 text-brand-charcoal" />

                </motion.button>

              </div>

              <motion.nav variants={container} initial="hidden" animate="show" className="flex flex-col gap-4">

                {links.map((link) => (

                  <motion.div key={link.href} variants={item}>

                    <Link

                      href={link.href}

                      onClick={() => setNavOpen(false)}

                      className="text-lg font-sans font-medium text-brand-charcoal hover:text-brand-pink-accent transition-colors"

                    >

                      {link.label}

                    </Link>

                  </motion.div>

                ))}

              </motion.nav>

            </motion.aside>

          </>

        )}

      </AnimatePresence>

    </DrawerPortal>

  );

}

