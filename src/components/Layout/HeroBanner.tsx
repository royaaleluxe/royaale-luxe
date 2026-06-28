"use client";



import { useState, useEffect } from "react";

import { motion } from "framer-motion";

import Image from "next/image";

import Link from "next/link";

import type { SiteSettings } from "@/lib/types";

import { SPRING_TRANSITION } from "@/lib/constants";

import { useUI } from "@/context/UIContext";



function Countdown({ endsAt }: { endsAt: string }) {

  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 });



  useEffect(() => {

    const tick = () => {

      const diff = new Date(endsAt).getTime() - Date.now();

      if (diff <= 0) return setTime({ d: 0, h: 0, m: 0, s: 0 });

      setTime({

        d: Math.floor(diff / 86400000),

        h: Math.floor((diff % 86400000) / 3600000),

        m: Math.floor((diff % 3600000) / 60000),

        s: Math.floor((diff % 60000) / 1000),

      });

    };

    tick();

    const id = setInterval(tick, 1000);

    return () => clearInterval(id);

  }, [endsAt]);



  return (

    <div className="flex gap-3 mt-4">

      {[

        { label: "Days", value: time.d },

        { label: "Hrs", value: time.h },

        { label: "Min", value: time.m },

        { label: "Sec", value: time.s },

      ].map((unit) => (

        <motion.div

          key={unit.label}

          className="bg-brand-pink-accent/30 backdrop-blur-md rounded-lg px-3 py-2 text-center min-w-[52px] border border-brand-pink-accent/40"

          animate={{ scale: [1, 1.05, 1] }}

          transition={{ duration: 1, repeat: Infinity }}

        >

          <div className="text-xl font-bold text-white">{String(unit.value).padStart(2, "0")}</div>

          <div className="text-[10px] uppercase tracking-wider text-white/70">{unit.label}</div>

        </motion.div>

      ))}

    </div>

  );

}



export function HeroBanner({ settings }: { settings: SiteSettings | null }) {

  const slides = settings?.heroSlides || [];

  const [current, setCurrent] = useState(0);

  const { overlayOpen } = useUI();



  useEffect(() => {

    if (slides.length <= 1 || overlayOpen) return;

    const id = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 6000);

    return () => clearInterval(id);

  }, [slides.length, overlayOpen]);



  if (slides.length === 0) return null;



  const slide = slides[current];



  return (

    <section className="relative mx-3 md:mx-6 mt-6 rounded-3xl overflow-hidden h-[50vh] md:h-[65vh] border border-brand-pink-accent/30">

      {slides.map((s, i) => (

        <motion.div

          key={s.image + i}

          className="absolute inset-0"

          initial={false}

          animate={{ opacity: i === current ? 1 : 0, scale: i === current ? 1 : 1.05 }}

          transition={{ duration: 0.8 }}

          style={{ pointerEvents: i === current ? "auto" : "none", zIndex: i === current ? 1 : 0 }}

        >

          <Image src={s.image} alt={s.title} fill className="object-cover" priority={i === 0} />

          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

        </motion.div>

      ))}



      <div className="relative z-10 h-full flex flex-col justify-center px-8 md:px-16 max-w-2xl">

        <motion.div

          key={current}

          initial={{ opacity: 0, y: 30 }}

          animate={{ opacity: 1, y: 0 }}

          transition={{ ...SPRING_TRANSITION, staggerChildren: 0.1 }}

        >

          {settings?.flashSaleActive && settings.flashSaleEndsAt && (

            <span className="inline-block px-3 py-1 mb-4 text-xs font-bold uppercase tracking-widest bg-brand-pink-accent/90 text-black rounded-full">

              Limited Drop

            </span>

          )}

          <h1 className="font-display text-4xl md:text-6xl font-bold text-white italic mb-3">

            {slide.title}

          </h1>

          <p className="text-white/90 text-lg md:text-xl font-light">{slide.subtitle}</p>

          {settings?.promoCode && (

            <p className="text-brand-pink-accent font-semibold mt-2">

              Use code <span className="font-mono">{settings.promoCode}</span> for{" "}

              {settings.promoDiscount}% off

            </p>

          )}

          {settings?.flashSaleActive && settings.flashSaleEndsAt && (

            <Countdown endsAt={settings.flashSaleEndsAt} />

          )}

          <Link href={slide.link}>

            <motion.span

              className="inline-block mt-6 px-8 py-3.5 bg-brand-pink-accent text-brand-charcoal font-semibold text-sm uppercase tracking-wider rounded-full"

              whileHover={{ scale: 1.02, y: -2 }}

              whileTap={{ scale: 0.98 }}

              transition={SPRING_TRANSITION}

            >

              {slide.cta}

            </motion.span>

          </Link>

        </motion.div>

      </div>



      {slides.length > 1 && (

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">

          {slides.map((_, i) => (

            <button

              key={i}

              onClick={() => setCurrent(i)}

              className={`h-2 rounded-full transition-all ${

                i === current ? "bg-brand-pink-accent w-6" : "bg-white/40 w-2"

              }`}

            />

          ))}

        </div>

      )}

    </section>

  );

}

