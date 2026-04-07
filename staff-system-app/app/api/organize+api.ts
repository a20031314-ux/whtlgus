export async function POST(request: Request) {
  const { input } = await request.json();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Convert messy instructions into a clean numbered task list.",
        },
        {
          role: "user",
          content: input,
        },
      ],
    }),
  });

  const data = await response.json();

  return Response.json({
    result: data.choices[0].message.content,
  });
}