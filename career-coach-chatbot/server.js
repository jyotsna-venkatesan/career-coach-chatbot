import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pdfParse from "pdf-parse";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Resume analysis endpoint
app.post("/api/analyze-resume", async (req, res) => {
  console.log("=== Resume Analysis Request Started ===");
  console.log("Request headers:", req.headers);
  console.log("Request body type:", typeof req.body);

  try {
    console.log("Received request body keys:", Object.keys(req.body || {}));
    const { resumeText } = req.body;

    if (!resumeText) {
      console.log("No resume text provided");
      return res.status(400).json({ error: "Resume text is required" });
    }

    console.log("Resume text length:", resumeText.length);
    console.log("=== FULL RESUME TEXT RECEIVED BY SERVER ===");
    console.log(resumeText);
    console.log("=== END RESUME TEXT ===");

    // Get API key from environment
    const apiKey =
      process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

    console.log("API key configured:", !!apiKey);
    if (!apiKey) {
      console.log("No API key found in environment");
      return res
        .status(500)
        .json({ error: "Anthropic API key not configured" });
    }

    const prompt = `You are an expert career counselor and resume reviewer. Analyze this resume and return ONLY valid JSON in the exact format specified below. Do not include any explanatory text before or after the JSON.

REQUIRED JSON FORMAT:
{
  "structure": {
    "score": [number between 0-100],
    "improvements": ["specific improvement 1", "specific improvement 2", "specific improvement 3"]
  },
  "content": {
    "score": [number between 0-100],
    "improvements": ["specific improvement 1", "specific improvement 2", "specific improvement 3"]
  },
  "ats": {
    "score": [number between 0-100],
    "improvements": ["specific improvement 1", "specific improvement 2", "specific improvement 3"]
  },
  "overall": {
    "score": [number between 0-100],
    "summary": "brief overall assessment summary"
  }
}

EVALUATION CRITERIA:
- Structure (0-100): Document formatting, section organization, layout, visual hierarchy, readability
- Content Effectiveness (0-100): Achievement quantification, relevant keywords, impact-focused descriptions, skills presentation
- ATS Compatibility (0-100): Standard section headers, machine-readable format, keyword optimization, formatting simplicity

RESUME TO ANALYZE:
${resumeText}

IMPORTANT: Return ONLY the JSON object. No other text.`;

    console.log("Making request to Anthropic API...");
    // Make request to Anthropic API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    console.log("Anthropic API response status:", response.status);
    console.log(
      "Anthropic API response headers:",
      Object.fromEntries(response.headers.entries()),
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API Error Response:", errorText);

      try {
        const errorData = JSON.parse(errorText);
        console.error("Anthropic API Error:", errorData);
        return res.status(response.status).json({
          error: `Anthropic API Error: ${
            errorData.error?.message || "Unknown error"
          }`,
        });
      } catch (parseError) {
        console.error("Failed to parse error response as JSON:", parseError);
        return res.status(response.status).json({
          error: `Anthropic API Error: ${response.status} - ${errorText}`,
        });
      }
    }

    const responseText = await response.text();
    console.log("Raw Anthropic response length:", responseText.length);
    console.log("=== FULL ANTHROPIC RESPONSE ===");
    console.log(responseText);
    console.log("=== END ANTHROPIC RESPONSE ===");
    console.log(
      "Raw Anthropic response preview:",
      responseText.substring(0, 500),
    );

    if (!responseText.trim()) {
      console.error("Empty response from Anthropic API");
      return res.status(500).json({
        error: "Empty response from Anthropic API",
      });
    }

    try {
      const data = JSON.parse(responseText);
      console.log("Parsed Anthropic response structure:", {
        hasContent: !!data.content,
        contentLength: data.content?.length,
        contentType: Array.isArray(data.content)
          ? "array"
          : typeof data.content,
      });

      if (
        !data.content ||
        !Array.isArray(data.content) ||
        data.content.length === 0
      ) {
        console.error("Invalid response structure from Anthropic:", data);
        return res.status(500).json({
          error: "Invalid response structure from Anthropic API",
        });
      }

      const content = data.content[0].text;
      console.log("Claude content length:", content.length);
      console.log("=== FULL CLAUDE CONTENT ===");
      console.log(content);
      console.log("=== END CLAUDE CONTENT ===");
      console.log("Claude content preview:", content.substring(0, 500));

      // Parse JSON response from Claude
      try {
        const analysis = JSON.parse(content);
        console.log("Successfully parsed analysis with scores:", {
          structure: analysis.structure?.score,
          content: analysis.content?.score,
          ats: analysis.ats?.score,
          overall: analysis.overall?.score,
        });

        console.log("=== FINAL ANALYSIS BEING SENT TO CLIENT ===");
        console.log(JSON.stringify(analysis, null, 2));
        console.log("=== END FINAL ANALYSIS ===");

        console.log("=== Resume Analysis Request Completed Successfully ===");
        return res.json(analysis);
      } catch (parseError) {
        console.error("Failed to parse Claude response as JSON:", parseError);
        console.error("Claude content that failed to parse:", content);
        return res.status(500).json({
          error: "Invalid JSON format in AI response: " + parseError.message,
        });
      }
    } catch (jsonError) {
      console.error("Failed to parse Anthropic response as JSON:", jsonError);
      console.error(
        "Response text that failed:",
        responseText.substring(0, 1000),
      );
      return res.status(500).json({
        error: "Invalid JSON response from Anthropic API: " + jsonError.message,
      });
    }
  } catch (error) {
    console.error("=== Resume Analysis Request Failed ===");
    console.error("Server error:", error);
    console.error("Error stack:", error.stack);

    // Ensure we always return a JSON response
    if (!res.headersSent) {
      return res.status(500).json({
        error: "Internal server error: " + error.message,
      });
    }
  }
});

// PDF extraction endpoint
app.post("/api/extract-pdf", async (req, res) => {
  console.log("=== PDF Extraction Request Started ===");

  try {
    const { pdfData } = req.body;

    if (!pdfData || !Array.isArray(pdfData)) {
      return res
        .status(400)
        .json({ error: "PDF data is required as byte array" });
    }

    console.log("PDF data length:", pdfData.length);

    // Convert array back to Buffer
    const buffer = Buffer.from(pdfData);
    console.log("PDF buffer size:", buffer.length, "bytes");

    // Parse PDF
    const data = await pdfParse(buffer);
    const extractedText = data.text.trim();

    console.log("=== EXTRACTED PDF TEXT ===");
    console.log("Text length:", extractedText.length);
    console.log("Extracted text:", extractedText);
    console.log("=== END EXTRACTED PDF TEXT ===");

    if (!extractedText) {
      return res.status(400).json({
        error: "No text could be extracted from the PDF",
        text: "[Empty PDF - no extractable text found]",
      });
    }

    console.log("=== PDF Extraction Request Completed Successfully ===");
    return res.json({ text: extractedText });
  } catch (error) {
    console.error("=== PDF Extraction Request Failed ===");
    console.error("PDF extraction error:", error);
    console.error("Error stack:", error.stack);

    return res.status(500).json({
      error: "Failed to extract text from PDF: " + error.message,
      text: "[PDF extraction failed - manual input required]",
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Resume Analysis API is running" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Resume Analysis API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
