import { NextResponse } from "next/server";
import OpenAI from "openai";

type InputMode = "chat" | "how_to_say";

type Correction = {
  corrected: string;
  highlighted: string;
  natural: string;
  explanation: string;
};

type ChatModeResponse = {
  assistantMessage: string;
  correction: Correction;
};

type HowToSayResponse = {
  expression: string;
  explanation: string;
  example: string;
};

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

function isHowToSayResponse(value: unknown): value is HowToSayResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const data = value as HowToSayResponse;
  return (
    typeof data.expression === "string" &&
    typeof data.explanation === "string" &&
    typeof data.example === "string"
  );
}

function buildCorrectionFallback(message: string): Correction {
  return {
    corrected: message,
    highlighted: message,
    natural: message,
    explanation: "일시적인 오류입니다. 다시 시도해주세요.",
  };
}

function normalizeCorrectionFields(
  message: string,
  correctionLike: Partial<Correction> | undefined,
): Correction {
  return {
    corrected: correctionLike?.corrected?.trim() || message,
    highlighted: correctionLike?.highlighted?.trim() || message,
    natural: correctionLike?.natural?.trim() || message,
    explanation:
      correctionLike?.explanation?.trim() ||
      "일시적인 오류입니다. 다시 시도해주세요.",
  };
}

function safeParseCorrection(raw: string, message: string): Correction {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (typeof parsed !== "object" || parsed === null) {
      return buildCorrectionFallback(message);
    }

    const data = parsed as {
      corrected?: string;
      highlighted?: string;
      natural?: string;
      explanation?: string;
      correction?: Partial<Correction>;
    };

    const correction = data.correction ?? data;
    return normalizeCorrectionFields(message, correction);
  } catch {
    console.error("JSON parse failed:", raw);
    return buildCorrectionFallback(message);
  }
}

async function getCorrection(client: OpenAI, message: string) {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You are an English correction assistant.",
          "Return ONLY valid JSON.",
          "{",
          '"corrected": "...",',
          '"highlighted": "...",',
          '"natural": "...",',
          '"explanation": "..."',
          "}",
          "Rules:",
          "- Do not include any extra text",
          "- Do not include markdown",
          "- Do not explain outside JSON",
          "- Always return all fields",
          "- If no correction needed, copy original sentence",
          "- highlighted must use [wrong -> correct] only for real errors",
          "- explanation must be short Korean",
        ].join("\n"),
      },
      {
        role: "user",
        content: message,
      },
    ],
  });

  const raw = completion.choices[0]?.message.content?.trim() ?? "";
  console.log("AI RAW:", raw);
  if (!raw) {
    return buildCorrectionFallback(message);
  }

  return safeParseCorrection(raw, message);
}

async function getAssistantMessage(client: OpenAI, message: string) {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: [
          "You are a friendly English conversation partner.",
          "Reply naturally in 2-3 short sentences.",
          "React to the user's meaning, add one small related thought, then ask exactly one follow-up question.",
          "Do not mention being an AI.",
        ].join("\n"),
      },
      {
        role: "user",
        content: message,
      },
    ],
  });

  const content = completion.choices[0]?.message.content?.trim();
  return content || "Got it. Tell me a little more about that?";
}

async function getChatModeResponse(client: OpenAI, message: string) {
  const [correction, assistantMessage] = await Promise.all([
    getCorrection(client, message),
    getAssistantMessage(client, message),
  ]);

  return {
    assistantMessage,
    correction,
  } satisfies ChatModeResponse;
}

async function getHowToSayResponse(client: OpenAI, message: string) {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "사용자가 입력한 내용을 자연스럽고 실제 대화에서 쓰는 영어로 바꿔줘.",
          "중요:",
          "- 입력이 여러 문장이라면 절대 생략하지 말고 모두 반영할 것",
          "- 의미를 줄이지 말 것",
          "- 두 문장 이상이면 자연스럽게 이어서 표현할 것",
          "- 필요하면 문장을 재구성해도 되지만, 내용은 모두 포함할 것",
          "출력 형식:",
          '{ "expression": "자연스러운 전체 영어 문장", "explanation": "핵심 표현 설명 (간단하게)", "example": "비슷한 상황 예문 1개" }',
          "Rules:",
          "- Return only JSON.",
          "- Do not include markdown.",
          "- Do not include extra text.",
          "- explanation은 한국어로 짧고 명확하게 작성할 것.",
        ].join("\n"),
      },
      {
        role: "user",
        content: message,
      },
    ],
  });

  const raw = completion.choices[0]?.message.content;
  if (!raw) {
    throw new Error("Empty how_to_say response.");
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!isHowToSayResponse(parsed)) {
    throw new Error("Invalid how_to_say response shape.");
  }

  return parsed;
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
    const body = (await request.json()) as { message?: string; mode?: InputMode };
    const message = body.message?.trim() ?? "";
    const mode: InputMode = body.mode === "how_to_say" ? "how_to_say" : "chat";

    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }

    if (mode === "how_to_say") {
      const howToSayResponse = await getHowToSayResponse(client, message);
      return NextResponse.json(howToSayResponse);
    }

    const chatResponse = await getChatModeResponse(client, message);
    return NextResponse.json(chatResponse);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request." },
      { status: 500 },
    );
  }
}
