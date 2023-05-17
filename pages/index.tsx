import React from "react";
import { Montserrat, Inter } from "next/font/google";
import { RecordingButton } from "@/components/RecordingButton";
import { Timer } from "@/components/Timer";
import { Upload } from "upload-js";
import {
  ClipboardIcon,
  MicrophoneIcon,
  RocketLaunchIcon,
} from "@heroicons/react/20/solid";
import copy from "copy-text-to-clipboard";

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
  const [showOriginal, setShowOriginal] = React.useState(false);
  const [doneTyping, setDoneTyping] = React.useState(false);

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

    setDoneTyping(true);
  }

  function handleCopy() {
    copy(summary);
    alert("Copied to clipboard!");
  }

  function handleReset() {
    setStatus("idle");
    setText("");
    setDoneTyping(false);
    setShowOriginal(false);
  }

  return (
    <main
      className={classNames(
        "p-4 flex flex-col justify-between h-[100dvh] max-w-md mx-auto",
        inter.className
      )}
    >
      <div>
        {status == "idle" && <LandingScreen />}
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
        {status == "busy" &&
          (text == "" ? (
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
            <div className="relative h-[100dvh] pb-16">
              <div
                className={classNames(
                  "text-2xl font-medium text-slate-800",
                  montserrat.className
                )}
              >
                {title}
              </div>
              <p className="mt-4 text-slate-500">{summary}</p>
              {doneTyping && (
                <div className="flex gap-x-3 mt-4 mb-3">
                  <button
                    className="rounded-full bg-slate-100 text-slate-500 px-4 py-1.5 flex items-center gap-x-1"
                    onClick={handleCopy}
                  >
                    <ClipboardIcon className="w-4 h-4 text-slate-400" />
                    Copy
                  </button>
                  <button
                    className="rounded-full bg-slate-100 text-slate-500 px-4 py-1.5"
                    onClick={() => setShowOriginal((p) => !p)}
                  >
                    Show original
                  </button>
                </div>
              )}
              {showOriginal && <div>{original}</div>}

              <button
                className="w-full py-2 px-4 bg-white rounded-md border border-slate-500 text-slate-500 fixed bottom-10"
                onClick={handleReset}
              >
                Record again
              </button>
            </div>
          ))}
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

function LandingScreen() {
  return (
    <>
      <h1
        className={classNames(
          "text-2xl text-slate-700 font-medium mt-2",
          montserrat.className
        )}
      >
        Capture Ideas Effortlessly
      </h1>
      <p className="mt-4 text-slate-500 leading-relaxed">
        Use Mic.ai to{" "}
        <span className="font-semibold text-slate-600">
          transform your audio notes into crystal clear summaries
        </span>{" "}
        that bring clarity and focus to your thoughts.
      </p>
      <div className="flex mt-8 gap-x-3">
        <div className="rounded-full bg-slate-50 w-10 h-10 grid place-items-center">
          <MicrophoneIcon className="h-6 w-6 text-slate-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-600 mt-2">
            Find clarity in the chaos
          </h3>
          <p className="mt-3 text-slate-500 leading-relaxed">
            Hit record and ramble. Mic.ai cuts through the clutter and zeroes in
            on the core of your ideas.
          </p>
        </div>
      </div>
      <div className="flex mt-8 gap-x-3">
        <div className="rounded-full bg-slate-50 w-10 h-10 grid place-items-center">
          <RocketLaunchIcon className="h-6 w-6 text-slate-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-600 mt-2">
            AI-Powered Summaries
          </h3>
          <p className="mt-3 text-slate-500 leading-relaxed">
            Embrace the future with concise, effortless transcriptions thanks to
            GPT-powered AI
          </p>
        </div>
      </div>
    </>
  );
}
