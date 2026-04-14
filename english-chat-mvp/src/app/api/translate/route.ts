import { NextResponse } from "next/server";
import OpenAI from "openai";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

export async function POST(request: Request) {
  const client = getOpenAIClient();
  if (!client) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as { text?: string };
    const text = body.text?.trim() ?? "";

    if (!text) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Translate the given English text into natural Korean. Return only the Korean translation with no labels, no markdown, and no additional commentary.",
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const translated = completion.choices[0]?.message.content?.trim();
    if (!translated) {
      throw new Error("Empty translation response.");
    }

    return NextResponse.json({ translated });
  } catch (error) {
    console.error("Translate API error:", error);
    return NextResponse.json(
      { error: "Failed to translate text." },
      { status: 500 },
    );
  }
}
