export function MarqueeBanner({ text }: { text: string }) {
  const repeated = `📢 ${text}     📢 ${text}     📢 ${text}     📢 ${text}     `;
  return (
    <div className="bg-stork-orange/10 border-b border-stork-orange/20 py-1.5" style={{ overflow: "hidden" }}>
      <div
        style={{
          display: "inline-block",
          whiteSpace: "nowrap",
          animation: "marquee-ltr 30s linear infinite",
          willChange: "transform",
        }}
      >
        <span className="text-sm text-stork-orange font-medium px-4">{repeated}</span>
      </div>
      <style>{`
        @keyframes marquee-ltr {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
