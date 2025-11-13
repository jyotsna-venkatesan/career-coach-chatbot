<script setup>
import ResumeUploadReview from "./components/ResumeUploadReview.vue";
import { ref, nextTick } from "vue";

const uploadedFile = ref(null);
const analysisData = ref(null);
const selectedMode = ref("interview");
const messages = ref([]);
const currentMessage = ref("");
const isLoading = ref(false);

// Interview state
const interviewState = ref({
  position: null,
  currentQuestionIndex: 0,
  questions: [],
  isActive: false,
  askedForResume: false,
  waitingForPosition: false,
});

// Pathway advisory state
const pathwayState = ref({
  userProfile: {
    education: null,
    experience: null,
    interests: null,
    skills: [],
  },
  currentStep: "education", // education, experience, interests, analysis
  careerPaths: [],
  isAnalyzing: false,
});

// Resource navigator state
const resourceState = ref({
  isSearching: false,
  lastQuery: null,
});

const modes = [
  { id: "interview", label: "Interview Simulator" },
  { id: "pathway", label: "Pathway Advisory" },
  { id: "resource", label: "Resource Navigator" },
];

const getModeDescription = () => {
  switch (selectedMode.value) {
    case "interview":
      return "Practice interviews with personalized questions based on your resume and target roles.";
    case "pathway":
      return "Get guidance on career paths, skill development, and professional growth strategies.";
    case "resource":
      return "Find relevant job opportunities, learning resources, and networking connections.";
    default:
      return "Get personalized career advice and resume feedback";
  }
};

const getModeWelcomeMessage = () => {
  switch (selectedMode.value) {
    case "interview":
      return "Ready to practice your interview skills? I'll ask you questions tailored to your experience and help you prepare for success! What position are you applying for?";
    case "pathway":
      return "Let's explore your career journey together! I'll help you map your academic background to potential career paths and identify development opportunities. What's your current educational background or degree?";
    case "resource":
      return 'Welcome to Resource Navigator! I can help you find career information, job opportunities, salary data, learning resources, and more. Try asking me things like:\n\n• "What are the salary ranges for software engineers?"\n• "Show me data science courses"\n• "Find tech jobs in Hong Kong"\n• "What skills are needed for marketing roles?"\n\nWhat would you like to explore today?';
    default:
      return "Welcome to PolyU Career Coach! How can I help you today?";
  }
};

const initializeChat = () => {
  messages.value = [
    {
      id: Date.now(),
      type: "bot",
      content: getModeWelcomeMessage(),
      timestamp: new Date(),
    },
  ];

  // Reset state when mode changes
  if (selectedMode.value === "interview") {
    interviewState.value = {
      position: null,
      currentQuestionIndex: 0,
      questions: [],
      isActive: false,
      askedForResume: false,
      waitingForPosition: true,
    };
  } else if (selectedMode.value === "pathway") {
    pathwayState.value = {
      userProfile: {
        education: null,
        experience: null,
        interests: null,
        skills: [],
      },
      currentStep: "education",
      careerPaths: [],
      isAnalyzing: false,
    };
  } else if (selectedMode.value === "resource") {
    resourceState.value = {
      isSearching: false,
      lastQuery: null,
    };
  }
};

const sendMessage = async () => {
  if (!currentMessage.value.trim() || isLoading.value) return;

  const userMessage = {
    id: Date.now(),
    type: "user",
    content: currentMessage.value.trim(),
    timestamp: new Date(),
  };

  messages.value.push(userMessage);
  const messageContent = currentMessage.value.trim();
  currentMessage.value = "";

  isLoading.value = true;

  try {
    if (selectedMode.value === "interview") {
      await handleInterviewMessage(messageContent);
    } else if (selectedMode.value === "pathway") {
      await handlePathwayMessage(messageContent);
    } else if (selectedMode.value === "resource") {
      await handleResourceMessage(messageContent);
    } else {
      // Handle other modes later
      await handleGeneralMessage(messageContent);
    }
  } catch (error) {
    console.error("Error processing message:", error);
    addBotMessage("I'm sorry, I encountered an error. Please try again.");
  } finally {
    isLoading.value = false;
  }
};

const handleInterviewMessage = async (message) => {
  const lowerMessage = message.toLowerCase();

  // Check for end interview command
  if (
    lowerMessage.includes("end interview") ||
    lowerMessage.includes("stop interview")
  ) {
    if (interviewState.value.isActive) {
      interviewState.value.isActive = false;
      interviewState.value.waitingForPosition = false;
      addBotMessage(
        "Interview session ended. Great job practicing! Feel free to start a new interview anytime by telling me what position you'd like to practice for.",
      );
    } else {
      addBotMessage(
        "No interview is currently active. Tell me what position you'd like to practice for to start a new interview session!",
      );
    }
    return;
  }

  // If waiting for position
  if (
    interviewState.value.waitingForPosition &&
    !interviewState.value.position
  ) {
    interviewState.value.position = message;
    interviewState.value.waitingForPosition = false;

    // Ask about resume if not uploaded
    if (!uploadedFile.value && !interviewState.value.askedForResume) {
      interviewState.value.askedForResume = true;
      addBotMessage(
        `Great! I'll help you practice for a ${message} position. For the best interview experience, would you like to upload your resume? This will help me ask more personalized questions. You can upload it on the left side, or we can proceed without it. Type "continue" to start the interview now.`,
      );
      return;
    } else {
      await startInterview();
      return;
    }
  }

  // If user says continue after being asked about resume
  if (
    lowerMessage === "continue" &&
    interviewState.value.position &&
    !interviewState.value.isActive
  ) {
    await startInterview();
    return;
  }

  // If interview is active, handle answer and ask next question
  if (interviewState.value.isActive) {
    await handleInterviewAnswer(message);
    return;
  }

  // Default response for interview mode
  addBotMessage(
    "Please tell me what position you're applying for so we can start the interview practice!",
  );
};

const startInterview = async () => {
  interviewState.value.isActive = true;
  interviewState.value.currentQuestionIndex = 0;

  // Generate questions based on position and resume
  await generateInterviewQuestions();

  if (interviewState.value.questions.length > 0) {
    addBotMessage(
      `Perfect! Let's start your ${interviewState.value.position} interview practice. I'll ask you questions and provide feedback on your answers. Remember, you can say "end interview" at any time to stop.\n\nQuestion 1: ${interviewState.value.questions[0]}`,
    );
  } else {
    addBotMessage(
      "I'm having trouble generating questions right now. Please try again in a moment.",
    );
    interviewState.value.isActive = false;
  }
};

const generateInterviewQuestions = async () => {
  try {
    const response = await fetch("/api/generate-interview-questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        position: interviewState.value.position,
        hasResume: !!uploadedFile.value,
        resumeAnalysis: analysisData.value,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      interviewState.value.questions = data.questions || getDefaultQuestions();
    } else {
      interviewState.value.questions = getDefaultQuestions();
    }
  } catch (error) {
    console.error("Error generating questions:", error);
    interviewState.value.questions = getDefaultQuestions();
  }
};

const getDefaultQuestions = () => {
  return [
    "Tell me about yourself and why you're interested in this position.",
    "What are your greatest strengths and how do they relate to this role?",
    "Describe a challenging situation you faced at work and how you handled it.",
    "Where do you see yourself in 5 years?",
    "Why do you want to work for our company?",
    "What questions do you have for me?",
  ];
};

const handleInterviewAnswer = async (answer) => {
  try {
    // Get feedback on the answer
    const response = await fetch("/api/review-interview-answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question:
          interviewState.value.questions[
            interviewState.value.currentQuestionIndex
          ],
        answer: answer,
        position: interviewState.value.position,
      }),
    });

    let feedback = "Good answer! Here are some thoughts:\n\n";

    if (response.ok) {
      const data = await response.json();
      feedback =
        data.feedback ||
        feedback +
          "You provided relevant information and showed good communication skills.";
    } else {
      feedback +=
        "You provided relevant information and showed good communication skills.";
    }

    // Move to next question
    interviewState.value.currentQuestionIndex++;

    if (
      interviewState.value.currentQuestionIndex <
      interviewState.value.questions.length
    ) {
      const nextQuestion =
        interviewState.value.questions[
          interviewState.value.currentQuestionIndex
        ];
      addBotMessage(
        `${feedback}\n\nQuestion ${
          interviewState.value.currentQuestionIndex + 1
        }: ${nextQuestion}`,
      );
    } else {
      // Interview complete
      interviewState.value.isActive = false;
      addBotMessage(
        `${feedback}\n\n🎉 Interview Complete!\n\nGreat job completing the interview practice! You've answered all the questions. This kind of practice will help you feel more confident in real interviews.\n\nWould you like to practice for another position or do you have any questions about your performance?`,
      );
    }
  } catch (error) {
    console.error("Error reviewing answer:", error);
    addBotMessage(
      "Thank you for your answer! Let's continue with the next question.\n\nQuestion " +
        (interviewState.value.currentQuestionIndex + 2) +
        ": " +
        interviewState.value.questions[
          interviewState.value.currentQuestionIndex + 1
        ],
    );
    interviewState.value.currentQuestionIndex++;
  }
};

const getInputPlaceholder = () => {
  if (selectedMode.value === "interview") {
    return "Type your answer or position name...";
  } else if (selectedMode.value === "pathway") {
    const step = pathwayState.value.currentStep;
    switch (step) {
      case "education":
        return "e.g., Computer Science degree, MBA, Engineering...";
      case "experience":
        return "Describe your work experience or say 'no experience'...";
      case "interests":
        return "What type of work or industry interests you?";
      case "analysis":
        return "Ask for more details or specific skill guidance...";
      default:
        return "Tell me about your educational background...";
    }
  } else if (selectedMode.value === "resource") {
    return "Ask me about jobs, salaries, courses, skills, or career info...";
  } else {
    return "Ask me about your career or resume...";
  }
};

const handlePathwayMessage = async (message) => {
  const state = pathwayState.value;

  // Check for restart command
  if (
    message.toLowerCase().includes("start over") ||
    message.toLowerCase().includes("restart")
  ) {
    pathwayState.value = {
      userProfile: {
        education: null,
        experience: null,
        interests: null,
        skills: [],
      },
      currentStep: "education",
      careerPaths: [],
      isAnalyzing: false,
    };
    addBotMessage(
      "Let's start fresh! What's your current educational background or degree?",
    );
    return;
  }

  switch (state.currentStep) {
    case "education":
      state.userProfile.education = message;
      state.currentStep = "experience";
      addBotMessage(
        `Great! You have a background in ${message}. Now tell me about your work experience. If you're a student or recent graduate with no work experience, just say "no experience" or describe any internships, projects, or part-time work you've done.`,
      );
      break;

    case "experience":
      state.userProfile.experience = message;
      state.currentStep = "interests";
      addBotMessage(
        `Thanks for sharing your experience! Now, what are your career interests or goals? What type of work environment, role, or industry excites you most?`,
      );
      break;

    case "interests":
      state.userProfile.interests = message;
      state.currentStep = "analysis";
      addBotMessage(
        `Perfect! I'm now analyzing your profile to identify potential career paths and development opportunities. This may take a moment...`,
      );
      await analyzeCareerPathways();
      break;

    case "analysis":
      // Handle follow-up questions after analysis
      if (
        message.toLowerCase().includes("more details") ||
        message.toLowerCase().includes("tell me more")
      ) {
        addBotMessage(
          "I'd be happy to provide more details! Which career path would you like me to elaborate on? Or would you like specific guidance on skill development for any particular path?",
        );
      } else if (
        message.toLowerCase().includes("skill") ||
        message.toLowerCase().includes("learn")
      ) {
        await provideLearningResources(message);
      } else {
        addBotMessage(
          "I can help you with more details about any career path, specific skill development recommendations, or learning resources. What would you like to explore further? You can also say 'start over' to analyze a different profile.",
        );
      }
      break;

    default:
      addBotMessage(
        "I'm not sure how to help with that. Let me know what you'd like to explore about your career path!",
      );
  }
};

const analyzeCareerPathways = async () => {
  const state = pathwayState.value;
  state.isAnalyzing = true;

  try {
    const response = await fetch("/api/analyze-career-pathways", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userProfile: state.userProfile,
        resumeAnalysis: analysisData.value,
        hasResume: !!uploadedFile.value,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      state.careerPaths = data.pathways || [];

      if (state.careerPaths.length > 0) {
        let responseMessage =
          "🎯 Career Path Analysis Complete!\n\nBased on your profile, here are the most suitable career paths for you:\n\n";

        state.careerPaths.forEach((path, index) => {
          responseMessage += `${index + 1}. ${path.title}\n`;
          responseMessage += `• Match Score: ${path.matchScore}%\n`;
          responseMessage += `• Overview: ${path.description}\n`;
          responseMessage += `• Key Skills Needed: ${path.requiredSkills.join(
            ", ",
          )}\n`;

          if (path.skillGaps && path.skillGaps.length > 0) {
            responseMessage += `• Skills to Develop: ${path.skillGaps.join(
              ", ",
            )}\n`;
          }

          if (
            path.developmentSuggestions &&
            path.developmentSuggestions.length > 0
          ) {
            responseMessage += `• Development Opportunities: ${path.developmentSuggestions
              .slice(0, 2)
              .join(", ")}\n`;
          }

          responseMessage += `\n`;
        });

        responseMessage +=
          "💡 Ask me for more details about any specific path, or let me know what skills you'd like to develop!";
        addBotMessage(responseMessage);
      } else {
        addBotMessage(
          "I had trouble analyzing your profile. Let me provide some general career guidance based on what you've shared.",
        );
        await provideGeneralGuidance();
      }
    } else {
      await provideGeneralGuidance();
    }
  } catch (error) {
    console.error("Error analyzing career pathways:", error);
    await provideGeneralGuidance();
  } finally {
    state.isAnalyzing = false;
  }
};

const provideGeneralGuidance = async () => {
  const state = pathwayState.value;
  let guidance = `Based on your background in ${state.userProfile.education} and your interest in ${state.userProfile.interests}, here are some general career suggestions:\n\n`;

  // Simple logic for common degree types
  const education = state.userProfile.education.toLowerCase();
  if (
    education.includes("computer") ||
    education.includes("software") ||
    education.includes("it")
  ) {
    guidance +=
      "Tech Career Paths:\n• Software Developer\n• Data Analyst\n• Product Manager\n• IT Consultant\n\n";
    guidance +=
      "Key Skills to Develop: Programming languages, cloud technologies, data analysis, project management\n\n";
  } else if (
    education.includes("business") ||
    education.includes("management")
  ) {
    guidance +=
      "Business Career Paths:\n• Business Analyst\n• Project Manager\n• Consultant\n• Operations Manager\n\n";
    guidance +=
      "Key Skills to Develop: Data analysis, leadership, communication, strategic thinking\n\n";
  } else if (education.includes("engineering")) {
    guidance +=
      "Engineering Career Paths:\n• Design Engineer\n• Project Engineer\n• Technical Consultant\n• Engineering Manager\n\n";
    guidance +=
      "Key Skills to Develop: Technical expertise, project management, communication, leadership\n\n";
  } else {
    guidance +=
      "General Career Paths:\n• Analyst roles in your field\n• Consulting\n• Project coordination\n• Specialized roles in your area of study\n\n";
  }

  guidance +=
    "💡 For more personalized recommendations, consider uploading your resume or providing more specific details about your interests!";
  addBotMessage(guidance);
};

const provideLearningResources = async (message) => {
  const resources = `📚 Learning & Development Resources:

Online Learning Platforms:
• Coursera - University courses and professional certificates
• LinkedIn Learning - Business and technical skills
• Udemy - Practical courses on various topics
• edX - Academic courses from top universities

Professional Development:
• Industry certifications relevant to your field
• Professional associations and networking groups
• Conferences and workshops
• Mentorship programs

Skill Building:
• GitHub for technical portfolios
• Kaggle for data science projects
• Volunteer work for experience
• Side projects to demonstrate skills

Would you like specific recommendations for any particular skill or career path?`;

  addBotMessage(resources);
};

const handleResourceMessage = async (message) => {
  const state = resourceState.value;
  state.lastQuery = message;
  state.isSearching = true;

  // Classify the query type and respond accordingly
  const queryType = classifyResourceQuery(message);

  try {
    switch (queryType) {
      case "salary":
        await handleSalaryQuery(message);
        break;
      case "jobs":
        await handleJobQuery(message);
        break;
      case "courses":
        await handleCourseQuery(message);
        break;
      case "skills":
        await handleSkillsQuery(message);
        break;
      case "company":
        await handleCompanyQuery(message);
        break;
      case "industry":
        await handleIndustryQuery(message);
        break;
      default:
        await handleGeneralResourceQuery(message);
    }
  } catch (error) {
    console.error("Error handling resource query:", error);
    addBotMessage(
      "I encountered an error while searching for resources. Please try rephrasing your question.",
    );
  } finally {
    state.isSearching = false;
  }
};

const classifyResourceQuery = (message) => {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("salary") ||
    lowerMessage.includes("pay") ||
    lowerMessage.includes("wage") ||
    lowerMessage.includes("income")
  ) {
    return "salary";
  } else if (
    lowerMessage.includes("job") ||
    lowerMessage.includes("position") ||
    lowerMessage.includes("career") ||
    lowerMessage.includes("opening")
  ) {
    return "jobs";
  } else if (
    lowerMessage.includes("course") ||
    lowerMessage.includes("learn") ||
    lowerMessage.includes("study") ||
    lowerMessage.includes("training")
  ) {
    return "courses";
  } else if (
    lowerMessage.includes("skill") ||
    lowerMessage.includes("requirement") ||
    lowerMessage.includes("qualification")
  ) {
    return "skills";
  } else if (
    lowerMessage.includes("company") ||
    lowerMessage.includes("employer") ||
    lowerMessage.includes("organization")
  ) {
    return "company";
  } else if (
    lowerMessage.includes("industry") ||
    lowerMessage.includes("sector") ||
    lowerMessage.includes("field")
  ) {
    return "industry";
  }
  return "general";
};

const handleSalaryQuery = async (message) => {
  // Extract job title/role from the message
  const jobRole = extractJobRole(message);

  const salaryData = getSalaryData(jobRole);

  let response = `💰 Salary Information for ${salaryData.title}:\n\n`;
  response += `• Entry Level: ${salaryData.entryLevel}\n`;
  response += `• Mid Level: ${salaryData.midLevel}\n`;
  response += `• Senior Level: ${salaryData.seniorLevel}\n\n`;
  response += `📈 Factors affecting salary:\n`;
  salaryData.factors.forEach((factor) => {
    response += `• ${factor}\n`;
  });
  response += `\n💡 Data based on Hong Kong market trends and industry reports.`;

  addBotMessage(response);
};

const handleJobQuery = async (message) => {
  const jobType = extractJobRole(message) || "general";
  const jobs = getJobListings(jobType);

  let response = `🔍 Job Opportunities${
    jobType !== "general" ? ` for ${jobType}` : ""
  }:\n\n`;

  jobs.forEach((job, index) => {
    response += `${index + 1}. ${job.title}\n`;
    response += `   Company: ${job.company}\n`;
    response += `   Location: ${job.location}\n`;
    response += `   Salary: ${job.salary}\n`;
    response += `   Type: ${job.type}\n\n`;
  });

  response += `💼 Tips for job searching:\n`;
  response += `• Tailor your resume for each application\n`;
  response += `• Research the company culture\n`;
  response += `• Practice your interview skills\n`;
  response += `• Network within your industry`;

  addBotMessage(response);
};

const handleCourseQuery = async (message) => {
  const subject = extractSkillOrSubject(message);
  const courses = getCourseRecommendations(subject);

  let response = `📚 Learning Resources${
    subject ? ` for ${subject}` : ""
  }:\n\n`;

  courses.forEach((course, index) => {
    response += `${index + 1}. ${course.title}\n`;
    response += `   Platform: ${course.platform}\n`;
    response += `   Duration: ${course.duration}\n`;
    response += `   Level: ${course.level}\n`;
    response += `   Price: ${course.price}\n\n`;
  });

  response += `🎯 Learning Tips:\n`;
  response += `• Set clear learning goals\n`;
  response += `• Practice with real projects\n`;
  response += `• Join online communities\n`;
  response += `• Get certified when possible`;

  addBotMessage(response);
};

const handleSkillsQuery = async (message) => {
  const role = extractJobRole(message);
  const skills = getSkillRequirements(role);

  let response = `🛠️ Skills Required for ${skills.role}:\n\n`;

  response += `Technical Skills:\n`;
  skills.technical.forEach((skill) => {
    response += `• ${skill}\n`;
  });

  response += `\nSoft Skills:\n`;
  skills.soft.forEach((skill) => {
    response += `• ${skill}\n`;
  });

  response += `\n📈 In-Demand Skills:\n`;
  skills.trending.forEach((skill) => {
    response += `• ${skill}\n`;
  });

  response += `\n💡 Skill Development Path:\n`;
  skills.developmentPath.forEach((step, index) => {
    response += `${index + 1}. ${step}\n`;
  });

  addBotMessage(response);
};

const handleCompanyQuery = async (message) => {
  const companies = getTopCompanies(message);

  let response = `🏢 Top Companies in Hong Kong:\n\n`;

  companies.forEach((company, index) => {
    response += `${index + 1}. ${company.name}\n`;
    response += `   Industry: ${company.industry}\n`;
    response += `   Size: ${company.size}\n`;
    response += `   Known for: ${company.specialty}\n\n`;
  });

  response += `💼 Company Research Tips:\n`;
  response += `• Check company reviews on Glassdoor\n`;
  response += `• Follow their LinkedIn and social media\n`;
  response += `• Research recent news and developments\n`;
  response += `• Network with current employees`;

  addBotMessage(response);
};

const handleIndustryQuery = async (message) => {
  const industry = extractIndustry(message);
  const industryInfo = getIndustryInfo(industry);

  let response = `🏭 ${industryInfo.name} Industry Overview:\n\n`;
  response += `📊 Market Size: ${industryInfo.marketSize}\n`;
  response += `📈 Growth Rate: ${industryInfo.growthRate}\n`;
  response += `👥 Employment: ${industryInfo.employment}\n\n`;

  response += `🔥 Hot Trends:\n`;
  industryInfo.trends.forEach((trend) => {
    response += `• ${trend}\n`;
  });

  response += `\n💼 Career Opportunities:\n`;
  industryInfo.careers.forEach((career) => {
    response += `• ${career}\n`;
  });

  response += `\n🎯 Key Skills in Demand:\n`;
  industryInfo.keySkills.forEach((skill) => {
    response += `• ${skill}\n`;
  });

  addBotMessage(response);
};

const handleGeneralResourceQuery = async (message) => {
  let response = `🔍 Here are some resources that might help:\n\n`;

  response += `📚 Popular Career Resources:\n`;
  response += `• JobsDB Hong Kong - Local job portal\n`;
  response += `• LinkedIn - Professional networking\n`;
  response += `• Coursera - Online courses\n`;
  response += `• Glassdoor - Company reviews & salaries\n\n`;

  response += `💡 Try asking me more specific questions like:\n`;
  response += `• "What's the salary for data scientists?"\n`;
  response += `• "Show me software engineering jobs"\n`;
  response += `• "What skills do I need for marketing?"\n`;
  response += `• "Tell me about the tech industry"\n\n`;

  response += `I can help you find information about salaries, jobs, courses, skills, companies, and industries!`;

  addBotMessage(response);
};

// Helper functions for data extraction and retrieval
const extractJobRole = (message) => {
  const roles = [
    "software engineer",
    "data scientist",
    "product manager",
    "designer",
    "developer",
    "analyst",
    "marketing",
    "finance",
    "hr",
    "sales",
  ];
  const lowerMessage = message.toLowerCase();
  return (
    roles.find((role) => lowerMessage.includes(role)) ||
    roles.find((role) => lowerMessage.includes(role.split(" ")[0]))
  );
};

const extractSkillOrSubject = (message) => {
  const subjects = [
    "programming",
    "data science",
    "machine learning",
    "design",
    "marketing",
    "business",
    "finance",
    "python",
    "javascript",
    "react",
  ];
  const lowerMessage = message.toLowerCase();
  return subjects.find((subject) => lowerMessage.includes(subject));
};

const extractIndustry = (message) => {
  const industries = [
    "technology",
    "finance",
    "healthcare",
    "education",
    "retail",
    "manufacturing",
  ];
  const lowerMessage = message.toLowerCase();
  return (
    industries.find((industry) => lowerMessage.includes(industry)) ||
    "technology"
  );
};

const getSalaryData = (role) => {
  const salaryDatabase = {
    "software engineer": {
      title: "Software Engineer",
      entryLevel: "HK$25,000 - HK$35,000",
      midLevel: "HK$40,000 - HK$60,000",
      seniorLevel: "HK$70,000 - HK$120,000",
      factors: [
        "Years of experience",
        "Technical stack expertise",
        "Company size",
        "Industry sector",
      ],
    },
    "data scientist": {
      title: "Data Scientist",
      entryLevel: "HK$30,000 - HK$45,000",
      midLevel: "HK$50,000 - HK$80,000",
      seniorLevel: "HK$90,000 - HK$150,000",
      factors: [
        "Advanced degree (PhD/Masters)",
        "Industry experience",
        "ML/AI expertise",
        "Domain knowledge",
      ],
    },
    "product manager": {
      title: "Product Manager",
      entryLevel: "HK$35,000 - HK$50,000",
      midLevel: "HK$60,000 - HK$90,000",
      seniorLevel: "HK$100,000 - HK$180,000",
      factors: [
        "Product success track record",
        "Technical background",
        "Leadership experience",
        "Market knowledge",
      ],
    },
  };

  return (
    salaryDatabase[role] || {
      title: "General Position",
      entryLevel: "HK$20,000 - HK$30,000",
      midLevel: "HK$35,000 - HK$55,000",
      seniorLevel: "HK$60,000 - HK$100,000",
      factors: [
        "Experience level",
        "Skills proficiency",
        "Industry demand",
        "Company budget",
      ],
    }
  );
};

const getJobListings = (jobType) => {
  const jobDatabase = {
    "software engineer": [
      {
        title: "Senior Software Engineer",
        company: "TechCorp HK",
        location: "Central, Hong Kong",
        salary: "HK$50K-70K",
        type: "Full-time",
      },
      {
        title: "Frontend Developer",
        company: "StartupXYZ",
        location: "Quarry Bay",
        salary: "HK$35K-50K",
        type: "Full-time",
      },
      {
        title: "Full Stack Developer",
        company: "Digital Solutions Ltd",
        location: "Tsim Sha Tsui",
        salary: "HK$40K-60K",
        type: "Full-time",
      },
    ],
    "data scientist": [
      {
        title: "Data Scientist",
        company: "Analytics Pro",
        location: "Admiralty",
        salary: "HK$55K-75K",
        type: "Full-time",
      },
      {
        title: "ML Engineer",
        company: "AI Innovations",
        location: "Science Park",
        salary: "HK$60K-80K",
        type: "Full-time",
      },
      {
        title: "Business Intelligence Analyst",
        company: "FinTech Hub",
        location: "IFC",
        salary: "HK$45K-65K",
        type: "Full-time",
      },
    ],
  };

  return (
    jobDatabase[jobType] || [
      {
        title: "General Analyst",
        company: "Business Solutions",
        location: "Central",
        salary: "HK$30K-45K",
        type: "Full-time",
      },
      {
        title: "Project Coordinator",
        company: "Global Corp",
        location: "Admiralty",
        salary: "HK$25K-35K",
        type: "Full-time",
      },
      {
        title: "Operations Specialist",
        company: "Local Enterprise",
        location: "Kowloon",
        salary: "HK$28K-40K",
        type: "Full-time",
      },
    ]
  );
};

const getCourseRecommendations = (subject) => {
  const courseDatabase = {
    programming: [
      {
        title: "Complete Python Bootcamp",
        platform: "Udemy",
        duration: "10 weeks",
        level: "Beginner",
        price: "HK$800",
      },
      {
        title: "JavaScript: The Complete Guide",
        platform: "Coursera",
        duration: "8 weeks",
        level: "Intermediate",
        price: "HK$400/month",
      },
      {
        title: "CS50: Introduction to Computer Science",
        platform: "edX",
        duration: "12 weeks",
        level: "Beginner",
        price: "Free",
      },
    ],
    "data science": [
      {
        title: "Data Science Professional Certificate",
        platform: "IBM (Coursera)",
        duration: "6 months",
        level: "Beginner",
        price: "HK$400/month",
      },
      {
        title: "Machine Learning Specialization",
        platform: "Stanford (Coursera)",
        duration: "4 months",
        level: "Intermediate",
        price: "HK$400/month",
      },
      {
        title: "Applied Data Science with Python",
        platform: "University of Michigan",
        duration: "5 months",
        level: "Intermediate",
        price: "HK$400/month",
      },
    ],
  };

  return (
    courseDatabase[subject] || [
      {
        title: "Professional Skills Development",
        platform: "LinkedIn Learning",
        duration: "4 weeks",
        level: "All Levels",
        price: "HK$300/month",
      },
      {
        title: "Career Advancement Course",
        platform: "FutureLearn",
        duration: "6 weeks",
        level: "Intermediate",
        price: "HK$200",
      },
      {
        title: "Industry Fundamentals",
        platform: "Udemy",
        duration: "8 weeks",
        level: "Beginner",
        price: "HK$600",
      },
    ]
  );
};

const getSkillRequirements = (role) => {
  const skillsDatabase = {
    "software engineer": {
      role: "Software Engineer",
      technical: [
        "Programming Languages (Python, Java, JavaScript)",
        "Database Management (SQL)",
        "Version Control (Git)",
        "Web Frameworks",
        "Cloud Platforms (AWS, Azure)",
      ],
      soft: [
        "Problem Solving",
        "Team Collaboration",
        "Communication",
        "Time Management",
        "Adaptability",
      ],
      trending: [
        "DevOps",
        "Microservices",
        "Container Technologies",
        "AI/ML Integration",
        "Cybersecurity",
      ],
      developmentPath: [
        "Master fundamental programming concepts",
        "Build personal projects portfolio",
        "Learn popular frameworks",
        "Contribute to open source",
        "Get industry certifications",
      ],
    },
    "data scientist": {
      role: "Data Scientist",
      technical: [
        "Python/R Programming",
        "Statistics & Mathematics",
        "Machine Learning",
        "Data Visualization",
        "SQL & Databases",
      ],
      soft: [
        "Analytical Thinking",
        "Business Acumen",
        "Communication",
        "Curiosity",
        "Attention to Detail",
      ],
      trending: [
        "Deep Learning",
        "MLOps",
        "Big Data Technologies",
        "Natural Language Processing",
        "Computer Vision",
      ],
      developmentPath: [
        "Build strong statistics foundation",
        "Learn programming (Python/R)",
        "Practice with real datasets",
        "Create ML projects",
        "Specialize in domain area",
      ],
    },
  };

  return (
    skillsDatabase[role] || {
      role: "General Professional",
      technical: [
        "Industry-specific software",
        "Data analysis tools",
        "Microsoft Office Suite",
        "Project management tools",
      ],
      soft: [
        "Communication",
        "Leadership",
        "Problem Solving",
        "Teamwork",
        "Time Management",
      ],
      trending: [
        "Digital literacy",
        "Remote work skills",
        "Cross-cultural communication",
        "Continuous learning",
      ],
      developmentPath: [
        "Identify core skills needed",
        "Take relevant courses",
        "Practice through projects",
        "Seek mentorship",
        "Stay updated with trends",
      ],
    }
  );
};

const getTopCompanies = (query) => {
  return [
    {
      name: "HSBC",
      industry: "Banking & Finance",
      size: "10,000+ employees",
      specialty: "International banking services",
    },
    {
      name: "Cathay Pacific",
      industry: "Aviation",
      size: "20,000+ employees",
      specialty: "Premium airline services",
    },
    {
      name: "HKT Limited",
      industry: "Telecommunications",
      size: "5,000+ employees",
      specialty: "Digital solutions & connectivity",
    },
    {
      name: "Swire Properties",
      industry: "Real Estate",
      size: "1,000+ employees",
      specialty: "Premium property development",
    },
    {
      name: "AIA Group",
      industry: "Insurance",
      size: "15,000+ employees",
      specialty: "Life insurance & wealth management",
    },
  ];
};

const getIndustryInfo = (industry) => {
  const industryDatabase = {
    technology: {
      name: "Technology",
      marketSize: "HK$850 billion (2023)",
      growthRate: "8-12% annually",
      employment: "350,000+ professionals",
      trends: [
        "Artificial Intelligence & Machine Learning",
        "FinTech innovations",
        "Smart city development",
        "Cybersecurity solutions",
      ],
      careers: [
        "Software Engineer",
        "Data Scientist",
        "Product Manager",
        "UX/UI Designer",
        "DevOps Engineer",
      ],
      keySkills: [
        "Programming",
        "Cloud computing",
        "Data analysis",
        "Agile methodology",
        "Digital transformation",
      ],
    },
    finance: {
      name: "Finance & Banking",
      marketSize: "HK$1.2 trillion (2023)",
      growthRate: "5-8% annually",
      employment: "250,000+ professionals",
      trends: [
        "Digital banking transformation",
        "Cryptocurrency adoption",
        "ESG investing",
        "RegTech solutions",
      ],
      careers: [
        "Investment Banker",
        "Financial Analyst",
        "Risk Manager",
        "Compliance Officer",
        "Wealth Manager",
      ],
      keySkills: [
        "Financial modeling",
        "Risk assessment",
        "Regulatory knowledge",
        "Data analytics",
        "Client relationship management",
      ],
    },
  };

  return industryDatabase[industry] || industryDatabase["technology"];
};

const handleGeneralMessage = async (message) => {
  // Placeholder for other modes
  addBotMessage(
    "This mode is coming soon! For now, try the Interview Simulator, Pathway Advisory, or Resource Navigator modes.",
  );
};

const addBotMessage = (content) => {
  messages.value.push({
    id: Date.now(),
    type: "bot",
    content: content,
    timestamp: new Date(),
  });

  nextTick(() => {
    scrollToBottom();
  });
};

const scrollToBottom = () => {
  const chatContainer = document.querySelector(".chat-messages");
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
};

const handleFileUploaded = (file) => {
  uploadedFile.value = file;
};

const handleFileRemoved = () => {
  uploadedFile.value = null;
  analysisData.value = null;
};

const handleAnalysisComplete = (analysis) => {
  analysisData.value = analysis;
};

// Initialize chat when component mounts
initializeChat();

// Watch for mode changes
import { watch } from "vue";
watch(selectedMode, () => {
  initializeChat();
});
</script>

<template>
  <div
    class="min-h-screen bg-main bg-cover bg-center bg-no-repeat py-6 flex flex-col sm:py-12 relative"
  >
    <!-- Dark overlay for better contrast -->
    <div class="absolute inset-0 bg-black bg-opacity-30 z-0"></div>
    <div class="relative z-10 flex flex-col h-full">
      <!-- Navbar -->
      <nav
        class="fixed top-4 left-1/2 transform -translate-x-1/2 w-full max-w-7xl z-50"
      >
        <div
          class="backdrop-blur-md bg-white bg-opacity-30 border border-white border-opacity-30 rounded-2xl px-9 py-4 flex items-center justify-between"
        >
          <!-- Logo -->
          <div class="flex items-center space-x-2">
            <img src="/icon.png" alt="PolyU Career Coach" class="w-6 h-6" />
            <span class="text-white text-md">PolyU Career Coach</span>
          </div>

          <!-- Navigation Links -->
          <div class="flex items-center space-x-6">
            <a
              href="#contact"
              class="text-white text-md hover:text-gray-200 transition-colors"
              >Contact Us</a
            >
            <a
              href="#about"
              class="text-white text-md hover:text-gray-200 transition-colors"
              >Read More</a
            >
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <div class="pt-16 px-4 flex-1">
        <div class="max-w-7xl mx-auto h-full">
          <div
            class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-[calc(100vh-12rem)]"
          >
            <!-- Left Side - Resume Upload and Review -->
            <div class="lg:col-span-1">
              <ResumeUploadReview
                @file-uploaded="handleFileUploaded"
                @file-removed="handleFileRemoved"
                @analysis-complete="handleAnalysisComplete"
              />
            </div>

            <!-- Right Side - Chat Window -->
            <div class="lg:col-span-2">
              <div
                class="backdrop-blur-md bg-white bg-opacity-30 border border-white border-opacity-30 rounded-2xl h-full flex flex-col max-h-[calc(100vh-12rem)]"
              >
                <!-- Chat Header -->
                <div class="border-b border-white border-opacity-30 p-4">
                  <h2 class="text-white text-md font-semibold">
                    Career Coach Chat
                  </h2>

                  <!-- Mode Selector -->
                  <div class="mt-3 mb-2">
                    <div class="flex bg-white bg-opacity-10 rounded-full p-1">
                      <button
                        v-for="mode in modes"
                        :key="mode.id"
                        @click="selectedMode = mode.id"
                        :class="[
                          'flex-1 px-3 py-2 text-xs font-medium rounded-full transition-all duration-200',
                          selectedMode === mode.id
                            ? 'bg-white bg-opacity-30 text-white'
                            : 'text-gray-200 hover:bg-white hover:bg-opacity-20',
                        ]"
                      >
                        {{ mode.label }}
                      </button>
                    </div>
                  </div>

                  <p class="text-sm text-gray-200">
                    {{ getModeDescription() }}
                  </p>
                </div>

                <!-- Chat Messages -->
                <div class="flex-1 p-4 overflow-y-auto chat-messages min-h-0">
                  <div class="space-y-4">
                    <!-- Messages -->
                    <div
                      v-for="message in messages"
                      :key="message.id"
                      class="flex items-start space-x-3"
                      :class="{
                        'flex-row-reverse space-x-reverse':
                          message.type === 'user',
                      }"
                    >
                      <div
                        class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        :class="
                          message.type === 'user'
                            ? 'bg-blue-500 bg-opacity-30'
                            : 'bg-white bg-opacity-20'
                        "
                      >
                        <svg
                          class="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            v-if="message.type === 'user'"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          ></path>
                          <path
                            v-else
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          ></path>
                        </svg>
                      </div>
                      <div class="flex-1 max-w-xs sm:max-w-md">
                        <div
                          class="rounded-lg p-3"
                          :class="
                            message.type === 'user'
                              ? 'bg-blue-500 bg-opacity-30 ml-auto'
                              : 'bg-white bg-opacity-20'
                          "
                        >
                          <p class="text-white text-sm whitespace-pre-wrap">
                            {{ message.content }}
                          </p>
                        </div>
                        <div
                          class="text-xs text-gray-300 mt-1"
                          :class="
                            message.type === 'user' ? 'text-right' : 'text-left'
                          "
                        >
                          {{
                            message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          }}
                        </div>
                      </div>
                    </div>

                    <!-- Loading Message -->
                    <div v-if="isLoading" class="flex items-start space-x-3">
                      <div
                        class="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center"
                      >
                        <svg
                          class="w-4 h-4 text-white animate-spin"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          ></path>
                        </svg>
                      </div>
                      <div class="flex-1">
                        <div class="bg-white bg-opacity-20 rounded-lg p-3">
                          <p class="text-white text-sm">Thinking...</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Chat Input -->
                <div class="border-t border-white border-opacity-30 p-4">
                  <div class="flex space-x-3">
                    <input
                      v-model="currentMessage"
                      type="text"
                      :placeholder="getInputPlaceholder()"
                      class="flex-1 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-full px-4 py-2 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                      @keyup.enter="sendMessage"
                      :disabled="isLoading"
                    />
                    <button
                      @click="sendMessage"
                      :disabled="isLoading || !currentMessage.trim()"
                      class="bg-white bg-opacity-30 hover:bg-opacity-40 disabled:bg-opacity-20 disabled:cursor-not-allowed border border-white border-opacity-30 rounded-full px-4 py-2 text-white text-md transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom styles can go here if needed */
</style>
