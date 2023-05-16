import React, { FC, useState, useEffect } from "react";
import { Montserrat } from "next/font/google";
const montserrat = Montserrat({ weight: "400", subsets: ["latin"] });

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
    <div className="flex flex-col items-center bg-slate-50 py-6 gap-y-6 rounded-lg">
      <div
        className={classNames(
          "text-4xl text-slate-600 tracking-wide",
          montserrat.className
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
