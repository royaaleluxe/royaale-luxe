"use client";

import { HamburgerMenu } from "@/components/Elements/HamburgerMenu";
import { Logo } from "@/components/Elements/Logo";
import { SearchBar } from "@/components/Elements/SearchBar";
import { NotificationBell } from "@/components/Elements/NotificationBell";
import { WishlistButton } from "@/components/Elements/WishlistButton";
import { CartDrawer } from "@/components/Layout/CartDrawer";
import { ProfileButton } from "@/components/Elements/ProfileButton";
import { MobileSearch } from "@/components/Elements/MobileSearch";
import { NavDrawer } from "@/components/Layout/NavDrawer";
import { HEADER_GLASS } from "@/lib/constants";

export function Header() {
  return (
    <>
      <header className={`${HEADER_GLASS} mx-3 md:mx-6 mt-3 md:mt-4 rounded-2xl border border-brand-pink-accent/50 shadow-glass`}>
        <div className="flex items-center justify-between gap-2 px-4 md:px-6 py-3">
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <HamburgerMenu />
          </div>

          <div className="flex-shrink-0">
            <Logo />
          </div>

          <SearchBar />

          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <MobileSearch />
            <NotificationBell />
            <WishlistButton />
            <CartDrawer />
            <ProfileButton />
          </div>
        </div>
      </header>
      <NavDrawer />
    </>
  );
}
