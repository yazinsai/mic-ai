// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import Replicate from "replicate";
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN ?? "",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { fileUrl } = req.body;
  const { transcription } = (await replicate.run(
    "openai/whisper:e39e354773466b955265e969568deb7da217804d8e771ea8c9cd0cef6591f8bc",
    {
      input: {
        audio: fileUrl,
        model: "large-v2",
      },
    }
  )) as any;

  res.status(200).json({ transcription });
}
