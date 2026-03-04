export function MarqueeBanner({ text }: { text: string }) {
  return (
    <div className="bg-stork-orange/10 border-b border-stork-orange/20 overflow-hidden py-1.5">
      <div className="flex whitespace-nowrap">
        <span className="animate-marquee inline-block text-sm text-stork-orange font-medium px-4">
          📢 {text} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 📢 {text}
        </span>
      </div>
    </div>
  );
}
