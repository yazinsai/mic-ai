// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextRequest, NextResponse } from "next/server";
import { OpenAILite } from "openai-lite";
import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from "eventsource-parser";

export const config = {
  runtime: "edge",
};

const openai = new OpenAILite(process.env.OPENAI_API_KEY ?? "");

export default async function handler(req: NextRequest, res: NextResponse) {
  const { transcription } = await req.json();
  if (!transcription) {
    return new NextResponse("Missing transcription", { status: 400 });
  }

  const stream = await openai.chat({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `You are a helpful assistant that takes a transcription from a user and summarizes it in a clear, concise and easy-to-read way. You must never mention "the speaker" in the summary; instead, write in first-person (e.g. "I suggest..."). Format your response in this style:

        Title: ...
        Summary: ...`,
      },
      { role: "user", content: `Transcription:\n${transcription}` },
    ],
    stream: true,
  });

  return new NextResponse(streamToResponse(stream));
}

function streamToResponse(response: any): ReadableStream {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data;

          if (data === "[DONE]") {
            controller.close();
            return;
          }

          try {
            const json = JSON.parse(data);
            const text = json.choices[0].delta.content;
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of response.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });
}
