export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { resumeText } = req.body;

    if (!resumeText) {
      return res.status(400).json({ error: 'Resume text is required' });
    }

    // Get API key from environment
    const apiKey = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const prompt = `Analyze the following resume and provide a detailed evaluation. Return your response in valid JSON format with the following structure:

{
  "structure": {
    "score": number (0-100),
    "improvements": ["improvement 1", "improvement 2", ...]
  },
  "content": {
    "score": number (0-100),
    "improvements": ["improvement 1", "improvement 2", ...]
  },
  "ats": {
    "score": number (0-100),
    "improvements": ["improvement 1", "improvement 2", ...]
  },
  "overall": {
    "score": number (0-100),
    "summary": "brief summary of overall assessment"
  }
}

Evaluation Criteria:
1. Structure (0-100): Format, organization, sections, layout, readability
2. Content Effectiveness (0-100): Relevance, achievements, quantified results, keywords, skills
3. ATS Compatibility (0-100): Keyword optimization, formatting compatibility, section headers, file format considerations

Resume Content:
${resumeText}

Provide specific, actionable feedback for each category. Focus on practical improvements that will enhance the resume's effectiveness.`;

    // Make request to Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `You are an expert career counselor and resume reviewer. Provide detailed, constructive feedback in valid JSON format only.

${prompt}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Anthropic API Error:', errorData);
      return res.status(response.status).json({
        error: `API Error: ${errorData.error?.message || 'Unknown error'}`,
      });
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Parse JSON response
    try {
      const analysis = JSON.parse(content);
      return res.status(200).json(analysis);
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', content);
      return res.status(500).json({
        error: 'Invalid response format from AI service',
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
}
