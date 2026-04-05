const MedicalPatternBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Subtle radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,_rgba(255,255,255,0.06)_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,_rgba(255,255,255,0.04)_0%,_transparent_50%)]" />
      
      {/* Geometric dot grid */}
      <div 
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Soft diagonal lines */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            135deg,
            transparent,
            transparent 40px,
            rgba(255,255,255,0.5) 40px,
            rgba(255,255,255,0.5) 41px
          )`,
        }}
      />

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
};

export default MedicalPatternBackground;
