/* eslint-disable @next/next/no-img-element */

// Icon only (magnifier + rising bars), for small spaces like the nav bar.
export function LogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return <img src="/so-rankly-mark.png" alt="SO Rankly" width={size} height={size} className={className} />;
}

// Full logo with wordmark, for the login screen.
export function LogoFull({ width = 240, className = '' }: { width?: number; className?: string }) {
  return <img src="/so-rankly-logo.png" alt="SO Rankly" width={width} height={Math.round((width * 438) / 1060)} className={className} />;
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <LogoMark size={size} />
      <span className="text-[17px] font-bold tracking-tight text-ios-label">
        <span className="text-[#E10E0E]">SO</span> Rankly
      </span>
    </div>
  );
}
