const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: "Method Not Allowed" }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    // Initialize with environment variable
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const { image } = JSON.parse(event.body);
    
    if (!image) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No image data provided" }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    const result = await model.generateContent([
      "Describe this image for an e-commerce site in bullet points. Use **bold** only for category labels (like **Clothes:**).",
      { 
        mimeType: "image/jpeg", 
        data: image 
      }
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        description: result.response.text() 
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Image processing failed",
        details: error.message 
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};