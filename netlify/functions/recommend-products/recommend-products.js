// netlify/functions/recommend-products.js

import { createClient } from "@supabase/supabase-js";
import { HfInference } from "@huggingface/inference";
import fetch from "node-fetch";

// ✅ Supabase client with environment variable
const supabase = createClient(
  "https://jsnbscsxsqrrdgllgttw.supabase.co",
  process.env.SUPABASE_ANON_KEY
);

// Hugging Face client
const hf = new HfInference(process.env.HF_API_TOKEN);

// Upload image to Supabase bucket
async function uploadToBucket(fileBuffer, fileName) {
  const { data, error } = await supabase.storage
    .from("uploads") // your public bucket name
    .upload(`user_uploads/${fileName}`, fileBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("uploads").getPublicUrl(`user_uploads/${fileName}`);

  return publicUrl;
}

export const handler = async (event) => {
  console.log("🔑 Supabase Key Length:", process.env.SUPABASE_ANON_KEY?.length); // Debug log

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

    const body = JSON.parse(event.body);
    const base64Image = body.imageBase64;
    if (!base64Image) throw new Error("No image provided");

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Image.split(",")[1], "base64");
    const fileName = `image_${Date.now()}.jpg`;

    // Upload to Supabase → get public URL
    const imageUrl = await uploadToBucket(imageBuffer, fileName);

    // Fetch image back (as Hugging Face expects remote file input)
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(
        `Failed to fetch uploaded image: ${imageResponse.statusText}`
      );
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageInput = Buffer.from(arrayBuffer);

    // Get embedding from Hugging Face
    const embedding = await hf.featureExtraction({
      model: "openai/clip-vit-base-patch32",
      inputs: imageInput,
    });

    // Call Supabase RPC
    const { data, error: rpcError } = await supabase.rpc("similar_products", {
      query_embedding: embedding,
      match_threshold: 0.25,
      match_count: 5,
    });

    if (rpcError) throw rpcError;

    return {
      statusCode: 200,
      body: JSON.stringify({
        products: data || [],
        imageUrl,
        message: "Recommendations retrieved",
      }),
    };
  } catch (err) {
    console.error("Recommendation error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to get recommendations",
        message: err.message,
      }),
    };
  }
};
