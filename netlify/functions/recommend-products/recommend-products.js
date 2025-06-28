import { createClient } from "@supabase/supabase-js";
import { HfInference } from "@huggingface/inference";
import fetch from "node-fetch";

// Initialize Supabase
const supabase = createClient(
  "https://jsnbscsxsqrrdgllgttw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
);

// Initialize Hugging Face
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

    // Download the image as a Buffer
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.buffer();

    // Extract features using buffer instead of Blob
    const embedding = await hf.featureExtraction({
      model: "openai/clip-vit-base-patch32",
      inputs: imageBuffer,
    });

    // Query Supabase
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
