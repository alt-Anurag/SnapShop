const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const { image } = JSON.parse(event.body);
    if (!image) throw new Error("No image data received");

    const result = await model.generateContent([
      "Describe this image in exactly one line at the top. And then using numbered bullet points, focus on products, clothes, objects and their colors, styles and distinct characteristics (if any) that would be relevant for shopping in the frame. The bullet points should be crisp and short. Do not use markdown for anything.",
      { mimeType: "image/jpeg", data: image },
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({ description: result.response.text() }),
    };
  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to analyze image" }),
    };
  }
};
