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
      return "Let's explore your career journey together! I can help you identify growth opportunities and plan your next steps.";
    case "resource":
      return "I'm here to help you find the resources you need! Whether it's job openings, courses, or networking opportunities, let's get started.";
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

  // Reset interview state when mode changes
  if (selectedMode.value === "interview") {
    interviewState.value = {
      position: null,
      currentQuestionIndex: 0,
      questions: [],
      isActive: false,
      askedForResume: false,
      waitingForPosition: true,
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
      `Perfect! Let's start your ${interviewState.value.position} interview practice. I'll ask you questions and provide feedback on your answers. Remember, you can say "end interview" at any time to stop.\n\n**Question 1:** ${interviewState.value.questions[0]}`,
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
        `${feedback}\n\n**Question ${
          interviewState.value.currentQuestionIndex + 1
        }:** ${nextQuestion}`,
      );
    } else {
      // Interview complete
      interviewState.value.isActive = false;
      addBotMessage(
        `${feedback}\n\n🎉 **Interview Complete!** \n\nGreat job completing the interview practice! You've answered all the questions. This kind of practice will help you feel more confident in real interviews. \n\nWould you like to practice for another position or do you have any questions about your performance?`,
      );
    }
  } catch (error) {
    console.error("Error reviewing answer:", error);
    addBotMessage(
      "Thank you for your answer! Let's continue with the next question.\n\n**Question " +
        (interviewState.value.currentQuestionIndex + 2) +
        ":** " +
        interviewState.value.questions[
          interviewState.value.currentQuestionIndex + 1
        ],
    );
    interviewState.value.currentQuestionIndex++;
  }
};

const handleGeneralMessage = async (message) => {
  // Placeholder for other modes
  addBotMessage(
    "This mode is coming soon! For now, try the Interview Simulator mode.",
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
    class="min-h-screen bg-main bg-cover bg-center bg-no-repeat py-6 flex flex-col sm:py-12"
  >
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
              class="backdrop-blur-md bg-white bg-opacity-30 border border-white border-opacity-30 rounded-2xl h-full flex flex-col"
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
              <div class="flex-1 p-4 overflow-y-auto chat-messages">
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
                    :placeholder="
                      selectedMode === 'interview'
                        ? 'Type your answer or position name...'
                        : 'Ask me about your career or resume...'
                    "
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
</template>

<style scoped>
/* Custom styles can go here if needed */
</style>
