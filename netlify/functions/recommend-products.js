// netlify/functions/recommend-products.js
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabase = createClient(
  "https://jsnbscsxsqrrdgllgttw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbmJzY3N4c3FycmRnbGxndHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4MzI5MzIsImV4cCI6MjA2NjQwODkzMn0.9aFwC1rV0yVYtwnRlQFJQjd-5BRCuUk9tYM-gddArt4"
);

// Updated Hugging Face API configuration
const HF_API_URL =
  "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/clip-vit-base-patch32";
const HF_TOKEN = process.env.HF_API_TOKEN;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    // Validate configuration
    if (!HF_TOKEN) {
      throw new Error("Hugging Face API token not configured");
    }

    const { imageUrl } = JSON.parse(event.body);
    if (!imageUrl) {
      throw new Error("No image URL provided");
    }

    // First download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    // Prepare the Hugging Face API request
    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {
          image: Buffer.from(imageBuffer).toString("base64"),
        },
      }),
    });

    if (hfResponse.status === 404) {
      throw new Error(
        "The model endpoint was not found. Please check the API URL."
      );
    }

    if (!hfResponse.ok) {
      const errorDetails = await hfResponse.text();
      throw new Error(
        `Hugging Face API error: ${hfResponse.statusText} - ${errorDetails}`
      );
    }

    const embedding = await hfResponse.json();

    // Query similar products from Supabase
    const { data, error: supabaseError } = await supabase.rpc(
      "similar_products",
      {
        query_embedding: embedding,
        match_threshold: 0.25,
        match_count: 5,
      }
    );

    if (supabaseError) throw supabaseError;

    return {
      statusCode: 200,
      body: JSON.stringify({
        products: data || [],
        message: "Successfully retrieved recommendations",
      }),
    };
  } catch (error) {
    console.error("Recommendation error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to get recommendations",
        message: error.message,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      }),
    };
  }
};
