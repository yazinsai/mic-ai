import React from "react";
import { Montserrat, Inter } from "next/font/google";
import { RecordingButton } from "@/components/RecordingButton";
import { Timer } from "@/components/Timer";
import { Upload } from "upload-js";

const montserrat = Montserrat({ weight: "500", subsets: ["latin"] });
const inter = Inter({ subsets: ["latin"] });

const upload = Upload({
  apiKey: process.env.NEXT_PUBLIC_UPLOAD_IO_KEY ?? "free",
});

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Home() {
  const [status, setStatus] = React.useState<"idle" | "active" | "busy">(
    "idle"
  );
  const [text, setText] = React.useState("");
  const [original, setOriginal] = React.useState("");
  const [recordingButtonKey, setRecordingButtonKey] = React.useState(0);

  const [title, setTitle] = React.useState("");
  const [summary, setSummary] = React.useState("");

  React.useEffect(() => {
    const titleRegex = /Title:\s(.+?)(?=\n)/;
    const summaryRegex = /Summary:\s([\s\S]*?)(?=\n|$)/;

    const titleMatch = text.match(titleRegex);
    const summaryMatch = text.match(summaryRegex);

    setTitle(titleMatch ? titleMatch[1] : "");
    setSummary(summaryMatch ? summaryMatch[1] : "");
  }, [text]);

  async function handleStartRecording() {
    setStatus("active");
  }

  async function handleFinishRecording(blob: Blob) {
    setStatus("busy");

    // Upload
    const { fileUrl } = await upload.uploadFile(blob);

    // Transcribe
    const response = await fetch(`/api/transcribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileUrl }),
    });
    const { transcription } = await response.json();
    setOriginal(transcription);

    // Stream summary
    const stream = await fetch("/api/summarize", {
      method: "POST",
      body: JSON.stringify({ transcription }),
    });
    handleStream(stream);
  }

  async function handleCancelRecording() {
    setStatus("idle");
    setRecordingButtonKey((prev) => prev + 1); // recreate the recording button to terminate media stream
  }

  async function handleStream(stream: any) {
    const data = stream.body;
    if (!data) return;

    // Display the response
    const reader = data.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);
      setText((prev) => prev + chunkValue);
    }
  }

  return (
    <main
      className={classNames(
        "p-4 flex flex-col justify-between h-screen overflow-y-hidden",
        inter.className
      )}
    >
      <div>
        {status == "idle" && (
          <>
            <h1
              className={classNames(
                "text-2xl text-slate-800 font-medium mt-2",
                montserrat.className
              )}
            >
              New Note
            </h1>
            <p className="mt-4 text-slate-500 text-lg font-light">
              Click the microphone below to begin recording your note.
            </p>
          </>
        )}
        {status == "active" && (
          <>
            <h1
              className={classNames(
                "text-2xl text-slate-800 font-medium mt-2",
                montserrat.className
              )}
            >
              Recording
            </h1>
            <div className="h-6"></div>
            <Timer onCancel={handleCancelRecording} />
          </>
        )}
        {status == "busy" && text == "" ? (
          <>
            <h1
              className={classNames(
                "text-2xl text-slate-800 font-medium mt-2",
                montserrat.className
              )}
            >
              Transcribing&hellip;
            </h1>
            <p className="mt-4 text-slate-500 text-lg font-light">
              This can take up to a minute, depending on how long you’ve been
              rambling.
            </p>
          </>
        ) : (
          <>
            <div
              className={classNames(
                "text-2xl font-medium text-slate-800",
                montserrat.className
              )}
            >
              {title}
            </div>
            <p className="mt-4 text-slate-500">{summary}</p>
            <div>{original}</div>
          </>
        )}
      </div>

      {text == "" && (
        <div className="mx-auto mb-12">
          <RecordingButton
            key={recordingButtonKey}
            onStartRecording={handleStartRecording}
            onStopRecording={handleFinishRecording}
          />
        </div>
      )}
    </main>
  );
}
