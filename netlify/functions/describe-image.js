const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.AIzaSyAkWLp68hygPw0vLO14O1YYcPzSN49EHco);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const { image } = JSON.parse(event.body);
    
    const result = await model.generateContent([
      "Describe this image for an e-commerce site in bullet points. Use **bold** for categories only.",
      { mimeType: "image/jpeg", data: image }
    ]);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ description: result.response.text() })
    };
  } catch (error) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};