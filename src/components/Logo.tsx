export default function Logo({ className = "h-12 w-auto" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      role="img" 
      aria-label="ZIII refined logo mark"
      className={className}
    >
      <defs>
        <style>
          {`.ink{fill:currentColor}.accent{fill:currentColor;opacity:.9}`}
        </style>
      </defs>

      <rect width="512" height="512" fill="none"/>

      {/* Z: menos redondeada (más corporativa) */}
      <path className="ink" d="
        M132 132
        H372
        C382 132 390 140 390 150
        C390 160 382 168 372 168
        H232
        L384 328
        C391 336 390 348 382 355
        C374 362 362 361 355 353
        L200 190
        V344
        H340
        C350 344 358 352 358 362
        C358 372 350 380 340 380
        H132
        C122 380 114 372 114 362
        V150
        C114 140 122 132 132 132
        Z" />

      {/* III: más redondeadas + progresión (métricas) */}
      {/* barra 1 (más baja) */}
      <rect className="ink" x="302" y="256" width="24" height="108" rx="12"/>
      {/* barra 2 (media) */}
      <rect className="ink" x="336" y="236" width="24" height="128" rx="12"/>
      {/* barra 3 (alta, acento) */}
      <rect className="accent" x="370" y="214" width="24" height="150" rx="12"/>
    </svg>
  )
}
