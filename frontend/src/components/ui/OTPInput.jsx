import React, { useState, useEffect, useRef } from "react";

const OTPInput = ({ length = 6, onComplete, resetTrigger }) => {
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const [activeInput, setActiveInput] = useState(0);
  const inputsRef = useRef([]);

  useEffect(() => {
    if (resetTrigger) {
      setOtp(new Array(length).fill(""));
      setActiveInput(0);
      inputsRef.current[0]?.focus();
    }
  }, [resetTrigger, length]);

  const handleTextChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < length - 1) {
      setActiveInput(index + 1);
      inputsRef.current[index + 1].focus();
    }

    if (newOtp.every((v) => v !== "")) {
      onComplete(newOtp.join(""));
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      setActiveInput(index - 1);
      inputsRef.current[index - 1].focus();
    }
  };

  const handleFocus = (index) => {
    setActiveInput(index);
  };

  const handlePaste = (e) => {
    const pasteData = e.clipboardData.getData("text").substring(0, length);
    if (!/^\d+$/.test(pasteData)) return; // Only allow numbers

    const newOtp = [...otp];
    pasteData.split("").forEach((char, index) => {
      if (index < length) {
        newOtp[index] = char;
      }
    });
    setOtp(newOtp);
    
    // Focus the last input or move next
    const lastIndex = Math.min(pasteData.length, length - 1);
    setActiveInput(lastIndex);
    inputsRef.current[lastIndex].focus();

    if (newOtp.every((v) => v !== "")) {
      onComplete(newOtp.join(""));
    }
    e.preventDefault();
  };

  return (
    <div className="flex justify-between gap-2">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputsRef.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onFocus={() => handleFocus(index)}
          onChange={(e) => handleTextChange(e.target.value, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className={`h-11 w-10 sm:h-12 sm:w-11 rounded-xl border bg-(--card-bg) text-center text-lg font-black transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
            activeInput === index
              ? "border-primary text-primary shadow-[0_0_15px_rgba(255,204,0,0.3)]"
              : "border-(--card-border) text-(--text-main)"
          }`}
        />
      ))}
    </div>
  );
};

export default OTPInput;
