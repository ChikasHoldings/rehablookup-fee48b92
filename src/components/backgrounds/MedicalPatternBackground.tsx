import { Pill, Heart, Stethoscope, Activity, Cross, Syringe, Thermometer, HeartPulse, Shield, Users } from "lucide-react";

const MedicalPatternBackground = () => {
  const icons = [
    { Icon: Pill, x: 3, y: 5, rotate: 15, size: 36 },
    { Icon: Heart, x: 12, y: 22, rotate: -10, size: 32 },
    { Icon: Stethoscope, x: 22, y: 3, rotate: 20, size: 40 },
    { Icon: Activity, x: 32, y: 30, rotate: -5, size: 44 },
    { Icon: Cross, x: 42, y: 12, rotate: 10, size: 28 },
    { Icon: Syringe, x: 52, y: 25, rotate: -20, size: 36 },
    { Icon: Thermometer, x: 62, y: 5, rotate: 25, size: 32 },
    { Icon: HeartPulse, x: 72, y: 28, rotate: -15, size: 40 },
    { Icon: Shield, x: 82, y: 8, rotate: 5, size: 36 },
    { Icon: Users, x: 92, y: 20, rotate: -8, size: 32 },
    { Icon: Pill, x: 6, y: 42, rotate: -25, size: 28 },
    { Icon: Heart, x: 18, y: 52, rotate: 12, size: 36 },
    { Icon: Cross, x: 35, y: 45, rotate: -18, size: 24 },
    { Icon: Activity, x: 48, y: 55, rotate: 8, size: 40 },
    { Icon: Stethoscope, x: 65, y: 42, rotate: -12, size: 32 },
    { Icon: Syringe, x: 78, y: 50, rotate: 22, size: 28 },
    { Icon: HeartPulse, x: 90, y: 45, rotate: -5, size: 36 },
    { Icon: Thermometer, x: 10, y: 68, rotate: 15, size: 32 },
    { Icon: Shield, x: 25, y: 75, rotate: -20, size: 28 },
    { Icon: Users, x: 40, y: 65, rotate: 10, size: 36 },
    { Icon: Pill, x: 55, y: 72, rotate: -8, size: 40 },
    { Icon: Heart, x: 70, y: 65, rotate: 18, size: 24 },
    { Icon: Cross, x: 85, y: 70, rotate: -15, size: 32 },
    { Icon: Activity, x: 2, y: 85, rotate: 5, size: 28 },
    { Icon: Stethoscope, x: 15, y: 90, rotate: -10, size: 36 },
    { Icon: Syringe, x: 30, y: 82, rotate: 25, size: 32 },
    { Icon: HeartPulse, x: 45, y: 88, rotate: -22, size: 28 },
    { Icon: Thermometer, x: 60, y: 85, rotate: 8, size: 36 },
    { Icon: Shield, x: 75, y: 90, rotate: -5, size: 24 },
    { Icon: Users, x: 90, y: 82, rotate: 15, size: 32 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {icons.map((item, index) => (
        <item.Icon
          key={index}
          className="absolute text-primary/[0.08]"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            transform: `rotate(${item.rotate}deg)`,
            width: item.size,
            height: item.size,
          }}
        />
      ))}
    </div>
  );
};

export default MedicalPatternBackground;
