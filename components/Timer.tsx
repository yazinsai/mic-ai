import React, { FC, useState, useEffect } from "react";
import { Inter } from "next/font/google";
const inter = Inter({ weight: "700", subsets: ["latin"] });

interface Props {
  onCancel: () => void;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const Timer: FC<Props> = ({ onCancel }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prevSeconds) => prevSeconds + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const formatTime = (time: number) => {
    return time.toString().padStart(2, "0");
  };

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return (
    <div className="flex flex-col items-center bg-slate-700 text-white py-8 gap-y-5 rounded-lg">
      <div
        className={classNames(
          "text-5xl text-transparent tracking-wide font-bold bg-gradient-to-r from-violet-50 to-violet-100 bg-clip-text",
          inter.className
        )}
      >
        {formatTime(minutes)}:{formatTime(remainingSeconds)}
      </div>
      <button onClick={onCancel} className="text-slate-400 underline">
        Cancel
      </button>
    </div>
  );
};
