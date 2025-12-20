import { Pill, Heart, Stethoscope, Activity, Cross, Syringe, Thermometer, HeartPulse, Shield, Users } from "lucide-react";

const MedicalPatternBackground = () => {
  const icons = [
    { Icon: Pill, x: 5, y: 8, rotate: 15, size: 20 },
    { Icon: Heart, x: 15, y: 25, rotate: -10, size: 18 },
    { Icon: Stethoscope, x: 25, y: 5, rotate: 20, size: 22 },
    { Icon: Activity, x: 35, y: 35, rotate: -5, size: 24 },
    { Icon: Cross, x: 45, y: 15, rotate: 10, size: 16 },
    { Icon: Syringe, x: 55, y: 28, rotate: -20, size: 20 },
    { Icon: Thermometer, x: 65, y: 8, rotate: 25, size: 18 },
    { Icon: HeartPulse, x: 75, y: 32, rotate: -15, size: 22 },
    { Icon: Shield, x: 85, y: 12, rotate: 5, size: 20 },
    { Icon: Users, x: 95, y: 25, rotate: -8, size: 18 },
    { Icon: Pill, x: 8, y: 45, rotate: -25, size: 16 },
    { Icon: Heart, x: 22, y: 55, rotate: 12, size: 20 },
    { Icon: Cross, x: 38, y: 48, rotate: -18, size: 14 },
    { Icon: Activity, x: 52, y: 58, rotate: 8, size: 22 },
    { Icon: Stethoscope, x: 68, y: 45, rotate: -12, size: 18 },
    { Icon: Syringe, x: 82, y: 52, rotate: 22, size: 16 },
    { Icon: HeartPulse, x: 92, y: 48, rotate: -5, size: 20 },
    { Icon: Thermometer, x: 12, y: 72, rotate: 15, size: 18 },
    { Icon: Shield, x: 28, y: 78, rotate: -20, size: 16 },
    { Icon: Users, x: 42, y: 68, rotate: 10, size: 20 },
    { Icon: Pill, x: 58, y: 75, rotate: -8, size: 22 },
    { Icon: Heart, x: 72, y: 68, rotate: 18, size: 14 },
    { Icon: Cross, x: 88, y: 72, rotate: -15, size: 18 },
    { Icon: Activity, x: 3, y: 88, rotate: 5, size: 16 },
    { Icon: Stethoscope, x: 18, y: 92, rotate: -10, size: 20 },
    { Icon: Syringe, x: 32, y: 85, rotate: 25, size: 18 },
    { Icon: HeartPulse, x: 48, y: 90, rotate: -22, size: 16 },
    { Icon: Thermometer, x: 62, y: 88, rotate: 8, size: 20 },
    { Icon: Shield, x: 78, y: 92, rotate: -5, size: 14 },
    { Icon: Users, x: 92, y: 85, rotate: 15, size: 18 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {icons.map((item, index) => (
        <item.Icon
          key={index}
          className="absolute text-primary/[0.04]"
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
