const WHATSAPP_URL = "https://wa.me/573150146056";

export function WhatsappFloat() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl hover:shadow-[#25D366]/40"
    >
      <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping animation-duration-[3s] opacity-10" />
      <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor" className="relative" aria-hidden="true">
        <path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4C7.6 4 4 7.6 4 12.05c0 1.42.37 2.8 1.08 4.02L4 20l4.05-1.06a8.04 8.04 0 0 0 3.99 1.07h.01c4.45 0 8.05-3.6 8.05-8.05a8 8 0 0 0-2.5-5.64Zm-5.55 12.4h-.01a6.7 6.7 0 0 1-3.4-.93l-.24-.15-2.4.63.64-2.34-.16-.24a6.68 6.68 0 0 1-1.02-3.55c0-3.7 3-6.7 6.7-6.7 1.79 0 3.47.7 4.74 1.96a6.65 6.65 0 0 1 1.96 4.74c0 3.7-3.01 6.7-6.71 6.7Zm3.67-5.02c-.2-.1-1.18-.58-1.36-.65-.18-.07-.32-.1-.45.1-.13.2-.51.65-.63.78-.12.13-.23.15-.43.05-.2-.1-.85-.31-1.62-1-.6-.53-1-1.19-1.12-1.39-.12-.2-.01-.31.09-.41.09-.09.2-.23.3-.35.1-.12.13-.2.2-.33.07-.13.03-.25-.02-.35-.05-.1-.45-1.08-.61-1.48-.16-.39-.33-.33-.45-.34l-.38-.01c-.13 0-.35.05-.53.25-.18.2-.7.68-.7 1.67s.72 1.94.82 2.07c.1.13 1.41 2.15 3.41 3.02.48.2.85.33 1.14.42.48.15.91.13 1.26.08.38-.06 1.18-.48 1.35-.95.17-.46.17-.86.12-.95-.05-.09-.18-.14-.38-.24Z" />
      </svg>
    </a>
  );
}
