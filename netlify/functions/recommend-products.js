// netlify/functions/recommend-products.js
const { createClient } = require("@supabase/supabase-js");
const { HfInference } = require("@huggingface/inference"); // Import the library

// Initialize Supabase client
const supabase = createClient(
  "https://jsnbscsxsqrrdgllgttw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbmJzY3N4c3FycmRnbGxndHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4MzI5MzIsImV4cCI6MjA2NjQwODkzMn0.9aFwC1rV0yVYtwnRlQFJQjd-5BRCuUk9tYM-gddArt4"
);

// Initialize Hugging Face Inference client with your token
import { InferenceClient } from "@huggingface/inference"; // Use InferenceClient
const hf = new InferenceClient(process.env.HF_API_TOKEN); // Initialize InferenceClient

exports.handler = async (event) => {
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

    // Get the image data as a Blob, which the library can handle
    const imageBlob = await imageResponse.blob();

    // Use the library to get embeddings (feature extraction)
    const embedding = await hf.featureExtraction({
      model: "openai/clip-vit-base-patch32",
      data: imageBlob,
    });

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
    // The library may throw specific errors that are more descriptive
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
