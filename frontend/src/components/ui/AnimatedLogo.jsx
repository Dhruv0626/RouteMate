import React from "react";

const AnimatedLogo = ({ size = 120, className = "" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Navy Blue Path - Recreating the professional 'R' structure */}
        <path
          d="M15 85 V35 L30 20 H60 L85 45 L70 55 C65 50 60 50 55 55 L85 85"
          className="stroke-[#001f3f] animate-draw-r"
          strokeWidth="10"
          strokeLinecap="butt"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Additional Navy Blue accents to close the 'R' loop properly */}
        <path
          d="M30 20 H60 L85 45 L70 55"
          className="fill-[#001f3f]"
        />
        <path
          d="M15 85 L35 85 L50 70 L30 70 Z"
          className="fill-[#001f3f]"
        />

        {/* The Road (Gold Yellow) - Perspective Tapered Curve */}
        <path
          d="M18 78 Q35 78 45 55 T75 35"
          className="stroke-primary animate-draw-road"
          strokeWidth="18"
          strokeLinecap="butt"
          fill="none"
        />
        
        {/* Road Lane Markers (Dashed White) */}
        <path
          d="M22 78 Q35 78 45 55 T72 35"
          stroke="white"
          strokeWidth="2.5"
          strokeDasharray="6 10"
          className="animate-road-dash"
          fill="none"
        />

        {/* Top-Left Pin (Gold Yellow) */}
        <g className="animate-float-pin-1" style={{ transformOrigin: '22px 20px' }}>
          <path
            d="M22 40 C22 40 14 30 14 22 C14 17.5 17.5 14 22 14 C26.5 14 30 17.5 30 22 C30 30 22 40 22 40Z"
            fill="var(--color-primary)"
          />
          <circle cx="22" cy="22" r="3" fill="white" />
        </g>

        {/* Bottom-Right Pin (Navy Blue) */}
        <g className="animate-float-pin-2" style={{ transformOrigin: '80px 70px' }}>
          <path
            d="M80 88 C80 88 72 78 72 70 C72 65.5 75.5 62 80 62 C84.5 62 88 65.5 88 70 C88 78 80 88 80 88Z"
            fill="#001f3f"
          />
          <circle cx="80" cy="70" r="3" fill="white" />
        </g>
      </svg>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes draw-r {
          0% { stroke-dasharray: 0 400; opacity: 0; }
          20% { opacity: 1; }
          100% { stroke-dasharray: 400 400; }
        }
        @keyframes draw-road {
          0% { stroke-dasharray: 0 200; opacity: 0; }
          40% { opacity: 1; }
          100% { stroke-dasharray: 200 200; }
        }
        @keyframes road-dash {
          to { stroke-dashoffset: -32; }
        }
        @keyframes float-pin {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-draw-r {
          animation: draw-r 3s ease-out forwards;
          stroke-dasharray: 400;
        }
        .animate-draw-road {
          animation: draw-road 3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          stroke-dasharray: 200;
        }
        .animate-road-dash {
          animation: road-dash 1s linear infinite;
        }
        .animate-float-pin-1 {
          animation: float-pin 3s ease-in-out infinite;
        }
        .animate-float-pin-2 {
          animation: float-pin 3.5s ease-in-out infinite;
        }
      `}} />
    </div>
  );
};

export default AnimatedLogo;
