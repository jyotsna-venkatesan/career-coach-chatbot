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

// Interview question generation endpoint
app.post("/api/generate-interview-questions", async (req, res) => {
  console.log("=== Interview Questions Generation Request Started ===");

  try {
    const { position, hasResume, resumeAnalysis } = req.body;

    if (!position) {
      return res.status(400).json({ error: "Position is required" });
    }

    console.log("Generating questions for position:", position);
    console.log("Has resume:", hasResume);

    // Get API key from environment
    const apiKey =
      process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.log("No API key found, using default questions");
      const defaultQuestions = [
        "Tell me about yourself and why you're interested in this position.",
        "What are your greatest strengths and how do they relate to this role?",
        "Describe a challenging situation you faced at work and how you handled it.",
        "Where do you see yourself in 5 years?",
        "Why do you want to work for our company?",
        "What questions do you have for me?",
      ];
      return res.json({ questions: defaultQuestions });
    }

    const resumeContext =
      hasResume && resumeAnalysis
        ? `The candidate has uploaded a resume with the following analysis:
         - Overall Score: ${resumeAnalysis.overall?.score || 0}/100
         - Summary: ${resumeAnalysis.overall?.summary || "No summary available"}
         Please tailor questions based on this information.`
        : "The candidate has not provided a resume, so ask general questions for the position.";

    const prompt = `You are an experienced interviewer. Generate 6 thoughtful interview questions for a ${position} position.

${resumeContext}

Return ONLY a JSON object in this exact format:
{
  "questions": [
    "question 1",
    "question 2",
    "question 3",
    "question 4",
    "question 5",
    "question 6"
  ]
}

Make the questions:
1. Relevant to the ${position} role
2. Progressive in difficulty (start easy, get more complex)
3. Mix of behavioral, technical, and situational questions
4. Professional and appropriate

IMPORTANT: Return ONLY the JSON object. No other text.`;

    console.log("Making request to Anthropic API for questions...");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.log("API request failed, using default questions");
      const defaultQuestions = [
        "Tell me about yourself and why you're interested in this position.",
        "What are your greatest strengths and how do they relate to this role?",
        "Describe a challenging situation you faced at work and how you handled it.",
        "Where do you see yourself in 5 years?",
        "Why do you want to work for our company?",
        "What questions do you have for me?",
      ];
      return res.json({ questions: defaultQuestions });
    }

    const responseText = await response.text();
    const data = JSON.parse(responseText);

    if (data.content && data.content[0] && data.content[0].text) {
      const content = data.content[0].text;
      try {
        const questionsData = JSON.parse(content);
        console.log("Generated questions successfully");
        return res.json(questionsData);
      } catch (parseError) {
        console.log("Failed to parse AI response, using default questions");
      }
    }

    // Fallback to default questions
    const defaultQuestions = [
      "Tell me about yourself and why you're interested in this position.",
      "What are your greatest strengths and how do they relate to this role?",
      "Describe a challenging situation you faced at work and how you handled it.",
      "Where do you see yourself in 5 years?",
      "Why do you want to work for our company?",
      "What questions do you have for me?",
    ];
    return res.json({ questions: defaultQuestions });
  } catch (error) {
    console.error("Error generating interview questions:", error);
    const defaultQuestions = [
      "Tell me about yourself and why you're interested in this position.",
      "What are your greatest strengths and how do they relate to this role?",
      "Describe a challenging situation you faced at work and how you handled it.",
      "Where do you see yourself in 5 years?",
      "Why do you want to work for our company?",
      "What questions do you have for me?",
    ];
    return res.json({ questions: defaultQuestions });
  }
});

// Interview answer review endpoint
app.post("/api/review-interview-answer", async (req, res) => {
  console.log("=== Interview Answer Review Request Started ===");

  try {
    const { question, answer, position } = req.body;

    if (!question || !answer) {
      return res
        .status(400)
        .json({ error: "Question and answer are required" });
    }

    console.log("Reviewing answer for question:", question);

    // Get API key from environment
    const apiKey =
      process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.log("No API key found, providing generic feedback");
      return res.json({
        feedback:
          "Thank you for your answer! You provided relevant information and demonstrated good communication skills. Consider adding more specific examples to strengthen your response.",
      });
    }

    const prompt = `You are an experienced interviewer providing constructive feedback on a candidate's interview answer.

Position: ${position}
Question: ${question}
Candidate's Answer: ${answer}

Provide helpful, constructive feedback that:
1. Acknowledges what they did well
2. Suggests specific improvements
3. Is encouraging and professional
4. Is 2-3 sentences long
5. Focuses on content, structure, and delivery

Return ONLY a JSON object in this exact format:
{
  "feedback": "your feedback here"
}

IMPORTANT: Return ONLY the JSON object. No other text.`;

    console.log("Making request to Anthropic API for feedback...");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.log("API request failed, providing generic feedback");
      return res.json({
        feedback:
          "Thank you for your answer! You provided relevant information and demonstrated good communication skills. Consider adding more specific examples to strengthen your response.",
      });
    }

    const responseText = await response.text();
    const data = JSON.parse(responseText);

    if (data.content && data.content[0] && data.content[0].text) {
      const content = data.content[0].text;
      try {
        const feedbackData = JSON.parse(content);
        console.log("Generated feedback successfully");
        return res.json(feedbackData);
      } catch (parseError) {
        console.log("Failed to parse AI response, using generic feedback");
      }
    }

    // Fallback feedback
    return res.json({
      feedback:
        "Thank you for your answer! You provided relevant information and demonstrated good communication skills. Consider adding more specific examples to strengthen your response.",
    });
  } catch (error) {
    console.error("Error reviewing interview answer:", error);
    return res.json({
      feedback:
        "Thank you for your answer! You provided relevant information and demonstrated good communication skills. Consider adding more specific examples to strengthen your response.",
    });
  }
});

// Career pathway analysis endpoint
app.post("/api/analyze-career-pathways", async (req, res) => {
  console.log("=== Career Pathway Analysis Request Started ===");

  try {
    const { userProfile, resumeAnalysis, hasResume } = req.body;

    if (!userProfile || !userProfile.education) {
      return res
        .status(400)
        .json({ error: "User profile with education is required" });
    }

    console.log("Analyzing career pathways for profile:", userProfile);

    // Get API key from environment
    const apiKey =
      process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.log("No API key found, using default pathways");
      const defaultPathways = generateDefaultPathways(userProfile);
      return res.json({ pathways: defaultPathways });
    }

    const resumeContext =
      hasResume && resumeAnalysis
        ? `The user has uploaded a resume with analysis:
         - Overall Score: ${resumeAnalysis.overall?.score || 0}/100
         - Summary: ${resumeAnalysis.overall?.summary || "No summary available"}
         Use this information to enhance the career path recommendations.`
        : "No resume provided - base recommendations on the profile information only.";

    const prompt = `You are an expert career counselor. Analyze this user profile and provide career pathway recommendations.

User Profile:
- Education: ${userProfile.education}
- Experience: ${userProfile.experience}
- Interests: ${userProfile.interests}

${resumeContext}

Return ONLY a JSON object in this exact format:
{
  "pathways": [
    {
      "title": "Career Path Title",
      "matchScore": 85,
      "description": "Brief description of this career path",
      "requiredSkills": ["skill1", "skill2", "skill3"],
      "skillGaps": ["gap1", "gap2"],
      "developmentSuggestions": ["suggestion1", "suggestion2", "suggestion3"],
      "salaryRange": "$50,000 - $80,000",
      "growthOutlook": "Strong growth expected"
    }
  ]
}

Provide 3-4 career paths that:
1. Match the user's education and interests
2. Consider their experience level
3. Have realistic skill requirements
4. Include specific development suggestions
5. Have match scores between 60-95%

IMPORTANT: Return ONLY the JSON object. No other text.`;

    console.log("Making request to Anthropic API for career analysis...");
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

    if (!response.ok) {
      console.log("API request failed, using default pathways");
      const defaultPathways = generateDefaultPathways(userProfile);
      return res.json({ pathways: defaultPathways });
    }

    const responseText = await response.text();
    const data = JSON.parse(responseText);

    if (data.content && data.content[0] && data.content[0].text) {
      const content = data.content[0].text;
      try {
        const pathwaysData = JSON.parse(content);
        console.log("Generated career pathways successfully");
        return res.json(pathwaysData);
      } catch (parseError) {
        console.log("Failed to parse AI response, using default pathways");
        const defaultPathways = generateDefaultPathways(userProfile);
        return res.json({ pathways: defaultPathways });
      }
    }

    // Fallback to default pathways
    const defaultPathways = generateDefaultPathways(userProfile);
    return res.json({ pathways: defaultPathways });
  } catch (error) {
    console.error("Error analyzing career pathways:", error);
    const defaultPathways = generateDefaultPathways(req.body.userProfile);
    return res.json({ pathways: defaultPathways });
  }
});

// Helper function to generate default career pathways
function generateDefaultPathways(userProfile) {
  const education = userProfile.education?.toLowerCase() || "";
  const interests = userProfile.interests?.toLowerCase() || "";

  let pathways = [];

  if (
    education.includes("computer") ||
    education.includes("software") ||
    education.includes("it")
  ) {
    pathways = [
      {
        title: "Software Developer",
        matchScore: 88,
        description: "Design and develop software applications and systems",
        requiredSkills: [
          "Programming",
          "Problem Solving",
          "Version Control",
          "Testing",
        ],
        skillGaps: ["Advanced Algorithms", "System Design"],
        developmentSuggestions: [
          "Complete coding bootcamp",
          "Build portfolio projects",
          "Contribute to open source",
        ],
        salaryRange: "$60,000 - $120,000",
        growthOutlook: "Excellent growth prospects",
      },
      {
        title: "Data Analyst",
        matchScore: 82,
        description:
          "Analyze data to help organizations make informed decisions",
        requiredSkills: ["Data Analysis", "SQL", "Statistics", "Visualization"],
        skillGaps: ["Machine Learning", "Advanced Statistics"],
        developmentSuggestions: [
          "Learn Python/R",
          "Get familiar with Tableau",
          "Complete data science course",
        ],
        salaryRange: "$50,000 - $90,000",
        growthOutlook: "Strong demand expected",
      },
    ];
  } else if (
    education.includes("business") ||
    education.includes("management")
  ) {
    pathways = [
      {
        title: "Business Analyst",
        matchScore: 85,
        description:
          "Bridge the gap between business needs and technical solutions",
        requiredSkills: [
          "Analysis",
          "Communication",
          "Process Improvement",
          "Documentation",
        ],
        skillGaps: ["Data Analytics", "Project Management"],
        developmentSuggestions: [
          "Get PMP certification",
          "Learn data analysis tools",
          "Develop presentation skills",
        ],
        salaryRange: "$55,000 - $95,000",
        growthOutlook: "Steady growth expected",
      },
      {
        title: "Project Manager",
        matchScore: 80,
        description:
          "Lead and coordinate projects from initiation to completion",
        requiredSkills: [
          "Leadership",
          "Planning",
          "Risk Management",
          "Communication",
        ],
        skillGaps: ["Agile Methodologies", "Advanced Project Tools"],
        developmentSuggestions: [
          "Obtain PMP certification",
          "Learn Agile/Scrum",
          "Practice leadership skills",
        ],
        salaryRange: "$65,000 - $110,000",
        growthOutlook: "Good opportunities across industries",
      },
    ];
  } else {
    pathways = [
      {
        title: "Analyst",
        matchScore: 75,
        description:
          "Research and analyze information in your field of expertise",
        requiredSkills: [
          "Research",
          "Analysis",
          "Communication",
          "Critical Thinking",
        ],
        skillGaps: ["Industry-specific tools", "Advanced analytics"],
        developmentSuggestions: [
          "Develop technical skills",
          "Network in your industry",
          "Gain relevant certifications",
        ],
        salaryRange: "$45,000 - $80,000",
        growthOutlook: "Varies by industry",
      },
      {
        title: "Consultant",
        matchScore: 72,
        description: "Provide expert advice and solutions to organizations",
        requiredSkills: [
          "Expertise",
          "Communication",
          "Problem Solving",
          "Client Management",
        ],
        skillGaps: ["Business development", "Specialized knowledge"],
        developmentSuggestions: [
          "Build subject matter expertise",
          "Develop consulting skills",
          "Create thought leadership content",
        ],
        salaryRange: "$55,000 - $120,000",
        growthOutlook: "Good for specialized expertise",
      },
    ];
  }

  return pathways;
}

// Resource search endpoint
app.post("/api/search-resources", async (req, res) => {
  console.log("=== Resource Search Request Started ===");

  try {
    const { query, queryType } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    console.log("Searching for resources:", query, "Type:", queryType);

    // Get API key from environment
    const apiKey =
      process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.log("No API key found, using default response");
      return res.json({
        results: [
          {
            title: "General Career Resource",
            description: "AI API not available. Using default resources.",
            type: "general",
            url: "#",
          },
        ],
      });
    }

    const prompt = `You are a career resource assistant. Provide helpful career information based on this query: "${query}"

Query Type: ${queryType || "general"}

Return ONLY a JSON object in this exact format:
{
  "results": [
    {
      "title": "Resource Title",
      "description": "Brief description of the resource",
      "type": "job|course|company|salary|skill",
      "details": "Additional relevant details or data"
    }
  ]
}

Provide 3-5 relevant results that would help someone with their career query. Focus on actionable, Hong Kong-relevant information when possible.

IMPORTANT: Return ONLY the JSON object. No other text.`;

    console.log("Making request to Anthropic API for resource search...");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.log("API request failed, using default results");
      return res.json({
        results: [
          {
            title: "Career Information",
            description:
              "AI service temporarily unavailable. Try using specific keywords in your search.",
            type: "general",
            details: "Please try again later or contact support.",
          },
        ],
      });
    }

    const responseText = await response.text();
    const data = JSON.parse(responseText);

    if (data.content && data.content[0] && data.content[0].text) {
      const content = data.content[0].text;
      try {
        const resourceData = JSON.parse(content);
        console.log("Generated resource results successfully");
        return res.json(resourceData);
      } catch (parseError) {
        console.log("Failed to parse AI response, using fallback");
      }
    }

    // Fallback results
    return res.json({
      results: [
        {
          title: "Career Resource Search",
          description: "Found general information related to your query.",
          type: "general",
          details: "Try refining your search with more specific terms.",
        },
      ],
    });
  } catch (error) {
    console.error("Error searching resources:", error);
    return res.json({
      results: [
        {
          title: "Search Error",
          description: "Unable to process search request at this time.",
          type: "error",
          details: "Please try again later.",
        },
      ],
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
