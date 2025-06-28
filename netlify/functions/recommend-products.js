// netlify/functions/recommend-products.js
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabaseUrl = "https://jsnbscsxsqrrdgllgttw.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbmJzY3N4c3FycmRnbGxndHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4MzI5MzIsImV4cCI6MjA2NjQwODkzMn0.9aFwC1rV0yVYtwnRlQFJQjd-5BRCuUk9tYM-gddArt4";
const supabase = createClient(supabaseUrl, supabaseKey);

// Hugging Face CLIP API endpoint
const HF_CLIP_API =
  "https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32";
const HF_TOKEN = "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"; // Get this from your Hugging Face account

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const { imageUrl } = JSON.parse(event.body);
    if (!imageUrl) {
      throw new Error("No image URL provided");
    }

    // Use the built-in fetch (available in Netlify Functions environment)
    // First download the image
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    // Send to Hugging Face CLIP API
    const response = await fetch(HF_CLIP_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/octet-stream",
      },
      body: Buffer.from(imageBuffer),
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    const embedding = await response.json();

    // Query similar products from Supabase
    const { data, error } = await supabase.rpc("similar_products", {
      query_embedding: embedding,
      match_threshold: 0.25,
      match_count: 5,
    });

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ products: data }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to get recommendations",
        details: error.message,
      }),
    };
  }
};
