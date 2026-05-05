"use client";

export function MarqueeBanner({ text }: { text: string }) {
  const content = `📢 ${text}     📢 ${text}     `;
  return (
    <div
      className="bg-stork-orange/10 border-b border-stork-orange/20 py-1.5"
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* invisible spacer to give the container its height */}
      <span className="text-sm font-medium opacity-0 px-4 pointer-events-none select-none">
        📢 {text}
      </span>
      {/* absolutely positioned span: doesn't affect page scroll-width */}
      <span
        className="text-sm text-stork-orange font-medium whitespace-nowrap"
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          transform: "translateY(-50%)",
          animation: "marquee-slide 28s linear infinite",
          paddingLeft: "1rem",
        }}
      >
        {content}
      </span>
      <style>{`
        @keyframes marquee-slide {
          0%   { transform: translateX(100vw) translateY(-50%); }
          100% { transform: translateX(-100%) translateY(-50%); }
        }
      `}</style>
    </div>
  );
}
