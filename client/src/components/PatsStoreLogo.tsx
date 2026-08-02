// Pat's game store — publisher-scoped brand mark (crimson/amber, matching
// the tactical-shooter tone of Pat's catalog), shown only on Pat's own
// publisher pages, next to the GameForge wordmark. See Layout.tsx#PortalNav.
export function PatsStoreLogo({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Pat's game store"
      role="img"
    >
      <path
        d="M16 2 L28 7 V16 C28 23 22 28 16 30 C10 28 4 23 4 16 V7 Z"
        fill="#0b0b0d"
        stroke="#b91c1c"
        strokeWidth={1.5}
      />
      <path d="M10 19 L16 15 L22 19" fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeLinecap="round" />
      <text x="16" y="15" fontFamily="sans-serif" fontWeight={700} fontSize={11} fill="#f59e0b" textAnchor="middle">
        P
      </text>
    </svg>
  );
}
