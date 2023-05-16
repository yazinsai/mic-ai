import React, { FC, useState } from "react";
import { MicrophoneIcon, StopIcon } from "@heroicons/react/24/solid";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

interface Props {
  onStartRecording: () => void;
  onStopRecording: (blob: Blob) => void;
}

export const RecordingButton: FC<Props> = ({
  onStartRecording,
  onStopRecording,
}) => {
  const [status, setStatus] = useState<"idle" | "active" | "busy">("idle");
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );

  React.useEffect(() => {
    // Cleanup media recorder
    return () => {
      if (mediaRecorder) {
        mediaRecorder.stop();
        setMediaRecorder(null);
      }
    };
  }, []);

  const toggleRecording = async () => {
    if (status == "idle") {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const newMediaRecorder = new MediaRecorder(stream);

      newMediaRecorder.ondataavailable = (e) => {
        onStopRecording(e.data);
      };

      newMediaRecorder.start();
      setMediaRecorder(newMediaRecorder);
      setStatus("active");
      onStartRecording();
    } else {
      if (mediaRecorder) {
        mediaRecorder.stop();
        setMediaRecorder(null);
        setStatus("busy");
      }
    }
  };

  return (
    <button
      onClick={toggleRecording}
      disabled={status == "busy"}
      className={classNames(
        `w-20 h-20 rounded-full grid place-items-center ${
          status == "active" ? "bg-red-500" : "bg-violet-500"
        } transition-colors duration-200 ease-in-out focus:outline-none`,
        status == "active" ? "pulsating" : ""
      )}
    >
      {status == "idle" && <MicrophoneIcon className="h-8 w-8 text-white" />}
      {status == "active" && <StopIcon className="h-8 w-8 text-white" />}
      {status == "busy" && <div className="loader h-14 w-14" />}
    </button>
  );
};
