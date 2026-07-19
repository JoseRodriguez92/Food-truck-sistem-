"use client";

import { useLayoutEffect, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Globe, Truck } from "lucide-react";
import gsap from "gsap";

const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/tresstreetfood/",
    badgeClass: "bg-linear-to-tr from-yellow-400 via-pink-500 to-purple-600",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="white"
        aria-hidden="true"
      >
        <path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.24 2.22.4.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.35 1.05.4 2.22.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.24 1.8-.4 2.22-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.05.35-2.22.4-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.24-2.22-.4a3.73 3.73 0 0 1-1.38-.9 3.73 3.73 0 0 1-.9-1.38c-.16-.42-.35-1.05-.4-2.22C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.24-1.8.4-2.22.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.05-.35 2.22-.4C8.42 2.21 8.8 2.2 12 2.2Zm0 1.98c-3.14 0-3.5.01-4.74.07-1.15.05-1.77.24-2.19.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.42-.35 1.04-.4 2.19-.06 1.24-.07 1.6-.07 4.74s.01 3.5.07 4.74c.05 1.15.24 1.77.4 2.19.21.55.47.94.88 1.35.41.41.8.67 1.35.88.42.16 1.04.35 2.19.4 1.24.06 1.6.07 4.74.07s3.5-.01 4.74-.07c1.15-.05 1.77-.24 2.19-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.42.35-1.04.4-2.19.06-1.24.07-1.6.07-4.74s-.01-3.5-.07-4.74c-.05-1.15-.24-1.77-.4-2.19a3.73 3.73 0 0 0-.88-1.35 3.73 3.73 0 0 0-1.35-.88c-.42-.16-1.04-.35-2.19-.4-1.24-.06-1.6-.07-4.74-.07Zm0 3.37a6.45 6.45 0 1 1 0 12.9 6.45 6.45 0 0 1 0-12.9Zm0 1.98a4.47 4.47 0 1 0 0 8.94 4.47 4.47 0 0 0 0-8.94Zm6.7-2.2a1.51 1.51 0 1 1-3.02 0 1.51 1.51 0 0 1 3.02 0Z" />
      </svg>
    ),
    hoverClass:
      "hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/10",
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@tresstreetfood",
    badgeClass: "bg-black",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        aria-hidden="true"
        className="overflow-visible"
      >
        <path
          className="opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          transform="translate(-0.7, -0.7)"
          fill="#25F4EE"
          d="M16.6 5.82c-1.02-.88-1.6-2.16-1.6-3.61h-3.03v13.83c0 1.55-1.26 2.81-2.81 2.81a2.81 2.81 0 0 1 0-5.62c.29 0 .57.04.84.13V10.4a5.85 5.85 0 0 0-.84-.06 5.84 5.84 0 1 0 5.84 5.84V9.4a8.44 8.44 0 0 0 4.94 1.58V7.95a5.62 5.62 0 0 1-3.34-2.13z"
        />
        <path
          className="opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          transform="translate(0.7, 0.7)"
          fill="#FE2C55"
          d="M16.6 5.82c-1.02-.88-1.6-2.16-1.6-3.61h-3.03v13.83c0 1.55-1.26 2.81-2.81 2.81a2.81 2.81 0 0 1 0-5.62c.29 0 .57.04.84.13V10.4a5.85 5.85 0 0 0-.84-.06 5.84 5.84 0 1 0 5.84 5.84V9.4a8.44 8.44 0 0 0 4.94 1.58V7.95a5.62 5.62 0 0 1-3.34-2.13z"
        />
        <path
          fill="white"
          d="M16.6 5.82c-1.02-.88-1.6-2.16-1.6-3.61h-3.03v13.83c0 1.55-1.26 2.81-2.81 2.81a2.81 2.81 0 0 1 0-5.62c.29 0 .57.04.84.13V10.4a5.85 5.85 0 0 0-.84-.06 5.84 5.84 0 1 0 5.84 5.84V9.4a8.44 8.44 0 0 0 4.94 1.58V7.95a5.62 5.62 0 0 1-3.34-2.13z"
        />
      </svg>
    ),
    hoverClass: "hover:border-border/80 hover:shadow-lg hover:shadow-black/30",
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/573150146056",
    badgeClass: "bg-[#25D366]",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="white"
        aria-hidden="true"
      >
        <path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4C7.6 4 4 7.6 4 12.05c0 1.42.37 2.8 1.08 4.02L4 20l4.05-1.06a8.04 8.04 0 0 0 3.99 1.07h.01c4.45 0 8.05-3.6 8.05-8.05a8 8 0 0 0-2.5-5.64Zm-5.55 12.4h-.01a6.7 6.7 0 0 1-3.4-.93l-.24-.15-2.4.63.64-2.34-.16-.24a6.68 6.68 0 0 1-1.02-3.55c0-3.7 3-6.7 6.7-6.7 1.79 0 3.47.7 4.74 1.96a6.65 6.65 0 0 1 1.96 4.74c0 3.7-3.01 6.7-6.71 6.7Zm3.67-5.02c-.2-.1-1.18-.58-1.36-.65-.18-.07-.32-.1-.45.1-.13.2-.51.65-.63.78-.12.13-.23.15-.43.05-.2-.1-.85-.31-1.62-1-.6-.53-1-1.19-1.12-1.39-.12-.2-.01-.31.09-.41.09-.09.2-.23.3-.35.1-.12.13-.2.2-.33.07-.13.03-.25-.02-.35-.05-.1-.45-1.08-.61-1.48-.16-.39-.33-.33-.45-.34l-.38-.01c-.13 0-.35.05-.53.25-.18.2-.7.68-.7 1.67s.72 1.94.82 2.07c.1.13 1.41 2.15 3.41 3.02.48.2.85.33 1.14.42.48.15.91.13 1.26.08.38-.06 1.18-.48 1.35-.95.17-.46.17-.86.12-.95-.05-.09-.18-.14-.38-.24Z" />
      </svg>
    ),
    hoverClass:
      "hover:border-[#25D366]/50 hover:shadow-lg hover:shadow-[#25D366]/10",
  },
];

export function LinksContent() {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const footerRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const orbs = root.querySelectorAll<HTMLElement>("[data-gsap-orb]");
    const items = root.querySelectorAll<HTMLElement>("[data-gsap-item]");
    const card = cardRef.current;
    const avatar = avatarRef.current;
    const title = titleRef.current;
    const footer = footerRef.current;

    const ctx = gsap.context(() => {
      // Force starting state explicitly (more reliable than .from() under
      // React Strict Mode's mount/unmount/remount dance in dev).
      gsap.set(orbs, { opacity: 0, scale: 0.6 });
      gsap.set(card, { opacity: 0, y: 50, scale: 0.92 });
      gsap.set(avatar, { opacity: 0, scale: 0, rotate: -200 });
      gsap.set(title, { opacity: 0, y: 18 });
      gsap.set(items, { opacity: 0, y: 18 });
      gsap.set(footer, { opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.to(orbs, {
        opacity: 1,
        scale: 1,
        duration: 1.2,
        ease: "power2.out",
        stagger: 0.15,
      })
        .to(card, { opacity: 1, y: 0, scale: 1, duration: 0.7 }, "-=1")
        .to(
          avatar,
          {
            opacity: 1,
            scale: 1,
            rotate: 0,
            duration: 0.7,
            ease: "back.out(1.8)",
          },
          "-=0.4",
        )
        .to(title, { opacity: 1, y: 0, duration: 0.5 }, "-=0.35")
        .to(
          items,
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.09 },
          "-=0.25",
        )
        .to(footer, { opacity: 1, duration: 0.4 }, "-=0.15");
    }, root);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    console.log("LinksContent mounted");
  }, []);

  return (
    <main
      ref={rootRef}
      className="relative min-h-dvh overflow-hidden bg-background flex items-center justify-center px-4 py-16"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, oklch(1 0 0 / 4%) 1px, transparent 0)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Decorative blur orbs */}
      <div
        data-gsap-orb
        className="absolute -top-16 -right-16 w-72 sm:w-96 lg:w-[32rem] h-72 sm:h-96 lg:h-[32rem] bg-primary/10 rounded-full blur-3xl"
      />
      <div
        data-gsap-orb
        className="absolute bottom-0 -left-20 w-60 sm:w-80 lg:w-[26rem] h-60 sm:h-80 lg:h-[26rem] bg-primary/10 rounded-full blur-3xl"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center text-center">
        {/* Card panel */}
        <div
          ref={cardRef}
          className="relative w-full rounded-3xl border border-border bg-card/60 backdrop-blur-md shadow-2xl shadow-black/40 ring-1 ring-white/5 px-6 py-7 sm:px-8 sm:py-9 overflow-hidden"
        >
          {/* top highlight line */}
          <span className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          {/* Avatar / logo ring */}
          <div
            ref={avatarRef}
            className="relative mx-auto mb-4 flex items-center justify-center w-20 h-20 rounded-full bg-background border border-border shadow-lg shadow-primary/10 ring-1 ring-primary/20"
          >
            <Image
              src="/LogoTipo-3StreetFood.svg"
              alt="3 Street Food"
              width={64}
              height={64}
              className="w-14 h-14 object-contain"
            />
            <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-primary ring-2 ring-card">
              <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
            </span>
          </div>

          <h1
            ref={titleRef}
            className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Comida callejera premium
          </h1>

          <div className="mt-6 w-full flex flex-col gap-3">
            <Link
              data-gsap-item
              href="/"
              className="group flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-primary-foreground font-semibold px-6 py-3.5 text-sm sm:text-base shadow-lg transition-all duration-300 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Globe className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:rotate-12" />
              Visitar Sitio Web
            </Link>

            <Link
              data-gsap-item
              href="/#truck"
              className="group flex items-center justify-center gap-2.5 w-full rounded-xl border border-border bg-background/60 text-foreground font-semibold px-6 py-3.5 text-sm sm:text-base shadow-xs transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary shrink-0 transition-transform duration-300 group-hover:scale-110">
                <Truck className="w-4 h-4" />
              </span>
              Arma Tu Truck
            </Link>
          </div>

          {/* Divider */}
          <div data-gsap-item className="mt-7 mb-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Síguenos
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="w-full flex flex-col gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                data-gsap-item
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center justify-center gap-2.5 w-full rounded-xl border border-border bg-background/60 text-foreground font-semibold px-6 py-3.5 text-sm sm:text-base shadow-xs transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${social.hoverClass}`}
              >
                <span
                  className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-transform duration-300 group-hover:scale-110 ${social.badgeClass}`}
                >
                  {social.icon}
                </span>
                {social.label}
              </a>
            ))}
          </div>
        </div>

        <p ref={footerRef} className="mt-8 text-xs text-muted-foreground">
          © {new Date().getFullYear()} 3 Street Food
        </p>
      </div>
    </main>
  );
}
