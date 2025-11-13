<script setup>
import ResumeUploadReview from "./components/ResumeUploadReview.vue";
import { ref } from "vue";

const uploadedFile = ref(null);
const analysisData = ref(null);

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
                <p class="text-sm text-gray-200">
                  Get personalized career advice and resume feedback
                </p>
              </div>

              <!-- Chat Messages -->
              <div class="flex-1 p-4 overflow-y-auto">
                <div class="space-y-4">
                  <!-- Welcome Message -->
                  <div class="flex items-start space-x-3">
                    <div
                      class="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center"
                    >
                      <svg
                        class="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                    </div>
                    <div class="flex-1">
                      <div class="bg-white bg-opacity-20 rounded-lg p-3">
                        <p class="text-white text-md">
                          Welcome to PolyU Career Coach! I'm here to help you
                          improve your resume and advance your career. Upload
                          your resume to get started, or ask me any
                          career-related questions.
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- File Upload Status Message -->
                  <div v-if="uploadedFile" class="flex items-start space-x-3">
                    <div
                      class="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center"
                    >
                      <svg
                        class="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                    </div>
                    <div class="flex-1">
                      <div class="bg-white bg-opacity-20 rounded-lg p-3">
                        <p class="text-white text-md">
                          Great! I can see you've uploaded "{{
                            uploadedFile.name
                          }}".
                          {{
                            analysisData
                              ? "I've analyzed your resume and found some areas for improvement."
                              : 'Click "Analyze Resume" to get detailed feedback on your resume.'
                          }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Analysis Complete Message -->
                  <div v-if="analysisData" class="flex items-start space-x-3">
                    <div
                      class="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center"
                    >
                      <svg
                        class="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        ></path>
                      </svg>
                    </div>
                    <div class="flex-1">
                      <div class="bg-white bg-opacity-20 rounded-lg p-3">
                        <p class="text-white text-md">
                          Your resume scored
                          {{ analysisData.overall?.score || 0 }}/100 overall.
                          {{ analysisData.overall?.summary }} Feel free to ask
                          me specific questions about any of the feedback!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Chat Input -->
              <div class="border-t border-white border-opacity-30 p-4">
                <div class="flex space-x-3">
                  <input
                    type="text"
                    placeholder="Ask me about your career or resume..."
                    class="flex-1 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-full px-4 py-2 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                  />
                  <button
                    class="bg-white bg-opacity-30 hover:bg-opacity-40 border border-white border-opacity-30 rounded-full px-4 py-2 text-white text-md transition-colors"
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
