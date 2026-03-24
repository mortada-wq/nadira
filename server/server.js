const path = require("path");
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const requiredEnvVars = [
  "STABILITY_API_KEY",
  "S3_BUCKET_NAME",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY"
];

const missingEnv = requiredEnvVars.filter((name) => !process.env[name]);
if (missingEnv.length > 0) {
  console.warn(
    `Missing required environment variables: ${missingEnv.join(", ")}`
  );
}

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "us-east-1"
});

const arabicStyleMap = {
  "واقعي":
    "photorealistic, highly detailed, professional photography, 8k uhd, sharp focus, DSLR quality",
  "رسوم متحركة":
    "cartoon style, pixar style, vibrant colors, animated, 3D cartoon render",
  "زيتي": "oil painting, artistic, textured brushstrokes, canvas texture",
  "ثلاثي الأبعاد":
    "3d render, octane render, unreal engine 5, professional CGI, detailed modeling",
  "أنمي": "anime style, manga art, cinematic anime scene, detailed anime",
  "سايبربانك":
    "cyberpunk aesthetic, neon lights, futuristic cityscape, neon noir"
};

const aspectRatioToDimensions = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1344, height: 768 },
  "9:16": { width: 768, height: 1344 },
  "4:3": { width: 1152, height: 896 }
};

const qualitySettings = {
  standard: { steps: 30, extra: "" },
  hd: { steps: 40, extra: "ultra detailed, high fidelity, premium quality" },
  ultra: {
    steps: 50,
    extra: "masterpiece, award winning, ultra high resolution, maximum detail"
  }
};

function sanitizePrompt(prompt) {
  return String(prompt || "").replace(/[<>]/g, "").trim();
}

async function translateToEnglish(arabicText) {
  if (!process.env.GOOGLE_TRANSLATE_API_KEY) {
    return arabicText;
  }

  try {
    const response = await axios.post(
      "https://translation.googleapis.com/language/translate/v2",
      {},
      {
        params: {
          q: arabicText,
          target: "en",
          source: "ar",
          key: process.env.GOOGLE_TRANSLATE_API_KEY
        },
        timeout: 10000
      }
    );

    return response.data?.data?.translations?.[0]?.translatedText || arabicText;
  } catch (error) {
    console.error("Translation error:", error?.response?.data || error.message);
    return arabicText;
  }
}

async function enhanceArabicPrompt(arabicPrompt, style, quality) {
  const translatedPrompt = await translateToEnglish(arabicPrompt);
  const styleModifier = arabicStyleMap[style] || arabicStyleMap["واقعي"];
  const qualityMeta = qualitySettings[quality] || qualitySettings.standard;
  const qualityEnhancers = `masterpiece, best quality, highly detailed, sharp focus, professional, ${qualityMeta.extra}`;
  const negativePrompt =
    "blurry, low quality, distorted, bad anatomy, watermark, text, signature, logo";

  return {
    positive: `${translatedPrompt}, ${styleModifier}, ${qualityEnhancers}`.replace(
      /\s+,/g,
      ","
    ),
    negative: negativePrompt
  };
}

async function generateWithStabilityAI(enhancedPrompt, options) {
  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    throw new Error("STABILITY_API_KEY is missing");
  }

  const dimensions =
    aspectRatioToDimensions[options.aspectRatio] || aspectRatioToDimensions["1:1"];
  const qualityMeta = qualitySettings[options.quality] || qualitySettings.standard;

  const response = await axios.post(
    "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
    {
      text_prompts: [
        { text: enhancedPrompt.positive, weight: 1 },
        { text: enhancedPrompt.negative, weight: -1 }
      ],
      cfg_scale: Number(options.creativity) || 7,
      width: dimensions.width,
      height: dimensions.height,
      samples: Number(options.numImages) || 1,
      steps: qualityMeta.steps
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json"
      },
      timeout: 60000
    }
  );

  if (!Array.isArray(response.data?.artifacts)) {
    throw new Error("Invalid response from Stability AI");
  }

  return response.data.artifacts;
}

async function uploadToS3(base64Image, filename) {
  const buffer = Buffer.from(base64Image, "base64");
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `nadira/${filename}`,
    Body: buffer,
    ContentType: "image/png",
    ACL: "public-read"
  };

  const result = await s3.upload(params).promise();
  return result.Location;
}

app.post("/api/generate", async (req, res) => {
  try {
    const prompt = sanitizePrompt(req.body?.prompt);
    const style = String(req.body?.style || "واقعي");
    const aspectRatio = String(req.body?.aspectRatio || "1:1");
    const quality = String(req.body?.quality || "standard");
    const creativity = Number(req.body?.creativity || 7);
    const numImages = Math.min(Math.max(Number(req.body?.numImages || 1), 1), 4);

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: "الرجاء كتابة وصف للصورة"
      });
    }

    const enhancedPrompt = await enhanceArabicPrompt(prompt, style, quality);
    const artifacts = await generateWithStabilityAI(enhancedPrompt, {
      aspectRatio,
      quality,
      creativity,
      numImages
    });

    const imageUrls = await Promise.all(
      artifacts.map(async (artifact, index) => {
        const filename = `${uuidv4()}-${index}.png`;
        return uploadToS3(artifact.base64, filename);
      })
    );

    return res.json({
      success: true,
      images: imageUrls,
      enhancedPrompt: enhancedPrompt.positive
    });
  } catch (error) {
    console.error("Generation error:", error?.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: "حدث خطأ في الخادم أثناء إنشاء الصور"
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
