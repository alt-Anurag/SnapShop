import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

const supabase = createClient(
  "https://jsnbscsxsqrrdgllgttw.supabase.co",
  process.env.SUPABASE_ANON_KEY
);

const HF_BACKEND_URL = "https://anurag2416-clip-embed-api.hf.space/recommend";

async function uploadToBucket(fileBuffer, fileName) {
  const { data, error } = await supabase.storage
    .from("uploads")
    .upload(`user_uploads/${fileName}`, fileBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from("uploads").getPublicUrl(`user_uploads/${fileName}`);

  return publicUrl;
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const base64Image = body.imageBase64;

    if (!base64Image) {
      throw new Error("No imageBase64 field provided in request.");
    }

    const imageBuffer = Buffer.from(base64Image.split(",")[1], "base64");
    const fileName = `image_${Date.now()}.jpg`;
    const imageUrl = await uploadToBucket(imageBuffer, fileName);

    const hfResponse = await fetch(HF_BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        match_threshold: 0.65,
        match_count: 5,
      }),
    });

    if (!hfResponse.ok) {
      const err = await hfResponse.json().catch(() => ({}));
      throw new Error(
        `Hugging Face API error: ${err.detail || hfResponse.statusText}`
      );
    }

    const result = await hfResponse.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        ...result,
        message: "✅ Successfully retrieved recommendations from HF backend",
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
