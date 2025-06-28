// netlify/functions/recommend-products.js

import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch"; // used for both Supabase and Hugging Face API

// ✅ Supabase client
const supabase = createClient(
  "https://jsnbscsxsqrrdgllgttw.supabase.co",
  process.env.SUPABASE_ANON_KEY
);

// Hugging Face REST token
const HF_API_TOKEN = process.env.HF_API_TOKEN;

// ✅ Upload image to Supabase bucket
async function uploadToBucket(fileBuffer, fileName) {
  const { data, error } = await supabase.storage
    .from("uploads")
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
  console.log("🔑 Supabase Key Length:", process.env.SUPABASE_ANON_KEY?.length);

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    if (!HF_API_TOKEN) {
      throw new Error("Hugging Face API token not configured");
    }

    const body = JSON.parse(event.body);
    const base64Image = body.imageBase64;
    if (!base64Image) throw new Error("No image provided");

    // Convert base64 to buffer for upload
    const imageBuffer = Buffer.from(base64Image.split(",")[1], "base64");
    const fileName = `image_${Date.now()}.jpg`;

    // ✅ Upload to Supabase
    const imageUrl = await uploadToBucket(imageBuffer, fileName);

    // ✅ Use Hugging Face Inference REST API (no SDK issues!)
    const hfResponse = await fetch(
      "https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32"
,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: base64Image,
        }),
      }
    );

    if (!hfResponse.ok) {
      const err = await hfResponse.json().catch(() => ({}));
      throw new Error(
        `Hugging Face error: ${err.error || hfResponse.statusText}`
      );
    }

    const embedding = await hfResponse.json();

    // ✅ Query Supabase RPC function for similar products
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
