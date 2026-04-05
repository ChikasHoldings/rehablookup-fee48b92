const MedicalPatternBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Radial gradient overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,_rgba(255,255,255,0.08)_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,_rgba(255,255,255,0.06)_0%,_transparent_50%)]" />
      
      {/* Geometric dot grid */}
      <div 
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      />

      {/* Diagonal lines */}
      <div 
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            135deg,
            transparent,
            transparent 36px,
            rgba(255,255,255,0.5) 36px,
            rgba(255,255,255,0.5) 37px
          )`,
        }}
      />

      {/* Cross-hatch accent */}
      <div 
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 36px,
            rgba(255,255,255,0.4) 36px,
            rgba(255,255,255,0.4) 37px
          )`,
        }}
      />

      {/* Soft glow circles */}
      <div className="absolute top-[15%] left-[10%] w-72 h-72 bg-white/[0.03] rounded-full blur-3xl" />
      <div className="absolute bottom-[10%] right-[15%] w-56 h-56 bg-white/[0.025] rounded-full blur-3xl" />

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
    </div>
  );
};

export default MedicalPatternBackground;
