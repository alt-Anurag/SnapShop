import { createClient } from "@supabase/supabase-js";
import { HfInference } from "@huggingface/inference";
import fetch from "node-fetch"; // required in Netlify Functions

// Initialize Supabase client
const supabase = createClient(
  "https://jsnbscsxsqrrdgllgttw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbmJzY3N4c3FycmRnbGxndHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4MzI5MzIsImV4cCI6MjA2NjQwODkzMn0.9aFwC1rV0yVYtwnRlQFJQjd-5BRCuUk9tYM-gddArt4"
);

// Initialize Hugging Face Inference client
const hf = new HfInference(process.env.HF_API_TOKEN);

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    if (!process.env.HF_API_TOKEN) {
      throw new Error("Hugging Face API token not configured");
    }

    const { imageUrl } = JSON.parse(event.body);
    if (!imageUrl) {
      throw new Error("No image URL provided");
    }

    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = new Blob([imageBuffer]);

    // Feature extraction using Hugging Face
    const embedding = await hf.featureExtraction({
      model: "openai/clip-vit-base-patch32",
      inputs: imageBlob,
    });

    // Query Supabase for similar products
    const { data, error: supabaseError } = await supabase.rpc("similar_products", {
      query_embedding: embedding,
      match_threshold: 0.25,
      match_count: 5,
    });

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
      }),
    };
  }
};
