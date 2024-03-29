import React from "react";
import { Inter, Roboto } from "next/font/google";
import { RecordingButton } from "@/components/RecordingButton";
import { Timer } from "@/components/Timer";
import { Upload } from "upload-js";
import {
  ClipboardIcon,
  MicrophoneIcon,
  RocketLaunchIcon,
  CodeBracketSquareIcon,
  ArrowUpTrayIcon
} from "@heroicons/react/20/solid";
import Head from "next/head";
import analytics from "@/lib/analytics";

const roboto = Roboto({ weight: "400", subsets: ["latin"] });
const inter = Inter({ weight: "700", subsets: ["latin"] });

const upload = Upload({
  apiKey: process.env.NEXT_PUBLIC_UPLOAD_IO_KEY ?? "free",
});

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

function getAudioDuration(audioBlob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audioContext = new AudioContext();
    const fileReader = new FileReader();

    fileReader.onloadend = () => {
      const arrayBuffer = fileReader.result as ArrayBuffer;
      audioContext.decodeAudioData(
        arrayBuffer,
        (audioBuffer) => {
          const durationInSeconds = audioBuffer.duration;
          resolve(durationInSeconds);
        },
        (error) => {
          reject(error);
        }
      );
    };

    fileReader.onerror = (error) => {
      reject(error);
    };

    fileReader.readAsArrayBuffer(audioBlob);
  });
}

function copy(contents: string) {
  navigator.clipboard.writeText(contents);

  // Fallback to creating a fake `textarea` and set its contents
  const storage = document.createElement("textarea");
  storage.value = contents;
  document.body.appendChild(storage);
  storage.select();
  storage.setSelectionRange(0, 99999);
  document.execCommand("copy");
  document.body.removeChild(storage);
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

    analytics.track("summaryGenerated", {
      duration: await getAudioDuration(blob),
      title,
    });
  }

  async function handleCancelRecording() {
    setStatus("idle");
    setRecordingButtonKey((prev) => prev + 1); // recreate the recording button to terminate media stream
    analytics.track("recordingCancelled");
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const blob = new Blob([reader.result as ArrayBuffer], { type: file.type });
      handleFinishRecording(blob);
    };
    reader.readAsArrayBuffer(file);
  };

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
    analytics.track("summaryCopied");
  }

  function handleReset() {
    setStatus("idle");
    setText("");
    setDoneTyping(false);
    setShowOriginal(false);
    analytics.track("reset");
  }

  return (
    <main
      className={classNames(
        "p-4 flex flex-col justify-between h-[100dvh] max-w-md mx-auto",
        roboto.className
      )}
    >
      <MetaTags />
      <div>
        {status == "idle" && <LandingScreen />}
        {status == "active" && (
          <>
            <h1
              className={classNames(
                "text-2xl text-slate-800 font-bold mt-2",
                inter.className
              )}
            >
              Recording&hellip;
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
                  "text-2xl text-slate-800 font-bold mt-2",
                  inter.className
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
            <div className="relative h-[100dvh]">
              <div
                className={classNames(
                  "text-2xl font-bold text-slate-800",
                  inter.className
                )}
              >
                {title}
              </div>
              <p className="mt-4 text-slate-500 pb-4">{summary}</p>
              {doneTyping && (
                <div className="flex gap-x-3">
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

              <div className="h-24"></div>

              <button
                className="w-[calc(100%-2rem)] py-2 px-4 bg-white rounded-md border border-slate-500 text-slate-500 fixed bottom-10"
                onClick={handleReset}
              >
                Record again
              </button>
            </div>
          ))}
      </div>

      {text == "" && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 flex flex-row space-x-8 items-center">
          <RecordingButton
            key={recordingButtonKey}
            onStartRecording={handleStartRecording}
            onStopRecording={handleFinishRecording}
          />

          <label htmlFor="upload-button" className="rounded-full bg-slate-50 p-4">
            <ArrowUpTrayIcon className="h-6 w-6 text-slate-600" />
          </label>

          <input
            id="upload-button"
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
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
          "text-2xl text-slate-700 font-bold mt-2 line",
          inter.className
        )}
      >
        Capture your ideas, effortlessly
      </h1>
      <p className="mt-4 text-slate-500 leading-relaxed text-xl">
        Transform your audio notes into crystal clear summaries.
      </p>
      <div className="flex mt-16 gap-x-3">
        <div className="rounded-full bg-slate-50 w-10 h-10 grid place-items-center">
          <MicrophoneIcon className="h-6 w-6 text-slate-700" />
        </div>
        <div className="flex-1">
          <h3
            className={classNames(
              "font-semibold text-lg text-slate-800 mt-1.5",
              inter.className
            )}
          >
            Find clarity in the chaos
          </h3>
          <p
            className={classNames(
              "mt-3 text-slate-500 leading-relaxed",
              roboto.className
            )}
          >
            Just hit record and ramble. Let us cut through the clutter and zero
            in on the core of your ideas.
          </p>
        </div>
      </div>
      <div className="flex mt-12 gap-x-3">
        <div className="rounded-full bg-slate-50 w-10 h-10 grid place-items-center">
          <RocketLaunchIcon className="h-6 w-6 text-slate-700" />
        </div>
        <div className="flex-1">
          <h3
            className={classNames(
              "font-semibold text-lg text-slate-800 mt-1.5",
              inter.className
            )}
          >
            AI-Powered Summaries
          </h3>
          <p
            className={classNames(
              "mt-3 text-slate-500 leading-relaxed",
              roboto.className
            )}
          >
            Embrace the future with concise, effortless transcriptions thanks to
            GPT-powered AI
          </p>
        </div>
      </div>
      <div className="flex mt-12 gap-x-3">
        <div className="rounded-full bg-slate-50 w-10 h-10 grid place-items-center">
          <CodeBracketSquareIcon className="h-6 w-6 text-slate-700" />
        </div>
        <div className="flex-1">
          <h3
            className={classNames(
              "font-semibold text-lg text-slate-800 mt-1.5",
              inter.className
            )}
          >
            100% Open Source
          </h3>
          <p
            className={classNames(
              "mt-3 text-slate-500 leading-relaxed",
              roboto.className
            )}
          >
            Use the hosted service, or host it yourself. You'll find the full
            source code on{" "}
            <a
              href="https://github.com/yazinsai/mic-ai"
              className="underline"
              target="_blank"
            >
              Github
            </a>
            .
          </p>
        </div>
      </div>
      <div className="h-32" />
    </>
  );
}

function MetaTags() {
  return (
    <Head>
      <head>
        <title>Capture Ideas Effortlessly with Mic AI</title>
        <meta
          name="description"
          content="Transform your audio notes into concise summaries with Mic AI - streamlining your thought process and enabling better decision-making."
        />
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <meta
          property="og:title"
          content="Capture Ideas Effortlessly with Mic AI"
        />
        <meta
          property="og:description"
          content="Transform your audio notes into concise summaries with Mic AI - streamlining your thought process and enabling better decision-making."
        />
        <meta property="og:image" content="https://mic.yazin.ai/meta.jpeg" />
        <meta property="og:url" content="https://mic.yazin.ai" />
        <meta property="og:type" content="website" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Capture Ideas Effortlessly with Mic AI"
        />
        <meta
          name="twitter:description"
          content="Transform your audio notes into concise summaries with Mic AI - streamlining your thought process and enabling better decision-making."
        />
        <meta name="twitter:image" content="https://mic.yazin.ai/meta.jpeg" />
      </head>
    </Head>
  );
}
