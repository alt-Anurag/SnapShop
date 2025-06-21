const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-vision" });

    const { image } = JSON.parse(event.body);
    if (!image) throw new Error("No image data received");

    // Convert base64 to Google Generative AI format
    const imageParts = [
      {
        inlineData: {
          data: image,
          mimeType: "image/jpeg",
        },
      },
    ];

    const result = await model.generateContent({
      contents: [
        {
          parts: [
            {
              text: "Describe this image in exactly one line at the top. Then using numbered bullet points, focus on products, clothes, objects and their colors, styles and distinct characteristics that would be relevant for shopping in short. Do not include any markdown formatting like bold fonts, or anything at all",
            },
            ...imageParts,
          ],
        },
      ],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ description: result.response.text() }),
    };
  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to analyze image",
        details: error.message,
      }),
    };
  }
};
