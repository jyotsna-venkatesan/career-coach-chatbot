// LLM Service for Resume Analysis using local API proxy
class LLMService {
  constructor() {
    this.apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || null;
    this.apiUrl = "/api/analyze-resume";
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  async analyzeResume(resumeText) {
    console.log("=== LLM SERVICE ANALYSIS STARTED ===");
    console.log("Resume text being sent to API:");
    console.log("Length:", resumeText?.length || 0);
    console.log(
      "Content preview:",
      resumeText?.substring(0, 500) || "No content",
    );
    console.log("Full content being sent:", resumeText);
    console.log("=== END RESUME TEXT ===");

    try {
      const requestBody = { resumeText: resumeText };
      console.log("Request body being sent:", requestBody);

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (!response.ok) {
        const responseText = await response.text();
        console.error("Error response:", responseText);

        try {
          const errorData = JSON.parse(responseText);
          throw new Error(`API Error: ${errorData.error || "Unknown error"}`);
        } catch (parseError) {
          throw new Error(`API Error: ${response.status} - ${responseText}`);
        }
      }

      const responseText = await response.text();
      console.log("=== API RESPONSE RECEIVED ===");
      console.log("Response text length:", responseText?.length || 0);
      console.log("Full response text:", responseText);
      console.log("=== END API RESPONSE ===");

      if (!responseText.trim()) {
        throw new Error("Empty response from server");
      }

      try {
        const analysis = JSON.parse(responseText);
        console.log("=== SUCCESSFULLY PARSED ANALYSIS ===");
        console.log("Parsed analysis:", analysis);
        console.log("=== END PARSED ANALYSIS ===");
        return analysis;
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError);
        console.error("Response that failed to parse:", responseText);
        throw new Error("Invalid JSON response from server");
      }
    } catch (error) {
      console.error("Resume Analysis Error:", error);
      throw error;
    }
  }

  // Extract text from different file types
  async extractTextFromFile(file) {
    console.log("=== FILE EXTRACTION STARTED ===");
    console.log("File name:", file.name);
    console.log("File type:", file.type);
    console.log("File size:", file.size, "bytes");

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const text = e.target.result;
        console.log("Raw file read result length:", text?.length || 0);
        console.log(
          "Raw file read result preview:",
          text?.substring(0, 200) || "No content",
        );

        if (file.type === "text/plain") {
          console.log("Processing as plain text file");
          console.log("Final extracted text:", text);
          resolve(text);
        } else if (file.type === "application/pdf") {
          console.log("Processing as PDF file - extracting actual content");

          // Read file as ArrayBuffer for PDF parsing
          const arrayBufferReader = new FileReader();
          arrayBufferReader.onload = async (event) => {
            try {
              const arrayBuffer = event.target.result;

              // Send to server for PDF parsing since pdf-parse doesn't work in browser
              const response = await fetch("/api/extract-pdf", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  pdfData: Array.from(new Uint8Array(arrayBuffer)),
                }),
              });

              if (!response.ok) {
                throw new Error("Failed to extract PDF content");
              }

              const result = await response.json();
              console.log("Extracted PDF text:", result.text);
              resolve(result.text);
            } catch (error) {
              console.error("PDF extraction failed:", error);
              // Fallback to placeholder if extraction fails
              const fallbackText = `[PDF parsing failed - using manual extraction]
${file.name}

This PDF could not be automatically parsed. Please copy and paste your resume content directly or try uploading as a text file.`;
              resolve(fallbackText);
            }
          };

          arrayBufferReader.onerror = () => {
            console.error("Failed to read PDF file");
            reject(new Error("Failed to read PDF file"));
          };

          arrayBufferReader.readAsArrayBuffer(file);
        } else if (file.type.includes("word")) {
          console.log(
            "Processing as Word document - using placeholder content",
          );
          const wordPlaceholder = `[Word Document Resume Content]
This is a Word document resume file. The actual content would be extracted using a document parsing library.
For demonstration purposes, this placeholder text represents resume content that would include:
- Contact information and personal details
- Professional summary highlighting key qualifications
- Detailed work experience with quantified achievements
- Educational background and certifications
- Technical and soft skills
- Additional sections like projects, publications, or awards

The AI will analyze this extracted content to provide comprehensive feedback.`;
          console.log("Word placeholder content:", wordPlaceholder);
          resolve(wordPlaceholder);
        } else {
          console.log("Processing as unknown file type - trying plain text");
          console.log("Final extracted text:", text);
          resolve(text);
        }
      };

      reader.onerror = (error) => {
        console.error("File reading error:", error);
        reject(new Error("Failed to read file"));
      };

      console.log("Starting file read as text...");
      reader.readAsText(file);
    });
  }

  // Validate file type and size
  validateFile(file) {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error("Please upload a PDF, Word document, or text file.");
    }

    if (file.size > maxSize) {
      throw new Error("File size must be less than 5MB.");
    }

    return true;
  }
}

export default new LLMService();
