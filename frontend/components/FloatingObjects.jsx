export default function FloatingObjects() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      {/* Floating Ring 1 */}
      <div
        className="absolute w-24 h-24 border-2 border-royal-orange rounded-full opacity-40 animate-floatSlow"
        style={{ top: '15%', left: '10%', animationDelay: '0s' }}
      />

      {/* Floating Ring 2 */}
      <div
        className="absolute w-16 h-16 border border-copper rounded-full opacity-30 animate-floatSlow"
        style={{ top: '60%', right: '15%', animationDelay: '2s', animationDuration: '12s' }}
      />

      {/* Floating Diamond Shape */}
      <div
        className="absolute w-12 h-12 border border-royal-orange rotate-45 opacity-25 animate-float"
        style={{ top: '40%', left: '80%', animationDelay: '1s' }}
      />

      {/* Floating Triangle */}
      <svg
        className="absolute w-20 h-20 animate-floatSlow opacity-30"
        style={{ top: '25%', right: '25%', animationDelay: '3s', animationDuration: '14s' }}
        viewBox="0 0 100 100"
      >
        <polygon points="50,10 90,90 10,90" fill="none" stroke="#E07A24" strokeWidth="1.5" />
      </svg>

      {/* Small Floating Circle */}
      <div
        className="absolute w-8 h-8 border border-copper rounded-full opacity-35 animate-float"
        style={{ top: '70%', left: '20%', animationDelay: '4s', animationDuration: '8s' }}
      />

      {/* Floating Hexagon */}
      <svg
        className="absolute w-16 h-16 animate-floatSlow opacity-25"
        style={{ top: '50%', left: '15%', animationDelay: '2.5s', animationDuration: '11s' }}
        viewBox="0 0 100 100"
      >
        <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" fill="none" stroke="#A3562A" strokeWidth="1.5" />
      </svg>

      {/* Floating Ring 3 (Large) */}
      <div
        className="absolute w-32 h-32 border border-royal-orange/50 rounded-full opacity-20 animate-float"
        style={{ top: '10%', right: '5%', animationDelay: '1.5s', animationDuration: '9s' }}
      />
    </div>
  );
}
