<template>
  <div class="space-y-6">
    <!-- Resume Upload Section -->
    <div
      class="backdrop-blur-md bg-white bg-opacity-30 border border-white border-opacity-30 rounded-2xl p-6"
    >
      <h2 class="text-white text-md font-semibold mb-4 flex items-center">
        <svg
          class="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          ></path>
        </svg>
        Resume Upload
      </h2>

      <div
        class="border-2 border-dashed border-white border-opacity-50 rounded-lg p-6 text-center transition-colors"
        :class="{ 'border-green-300 bg-green-50 bg-opacity-20': isDragOver }"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
      >
        <input
          type="file"
          id="resume-upload"
          class="hidden"
          accept=".pdf,.doc,.docx,.txt"
          @change="handleFileSelect"
          ref="fileInput"
        />

        <div v-if="!uploadedFile">
          <label
            for="resume-upload"
            class="cursor-pointer text-white text-md hover:text-gray-200 transition-colors"
          >
            <div class="mb-2">
              <svg
                class="w-12 h-12 mx-auto text-white opacity-60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
            </div>
            <div>Click to upload your resume</div>
            <div class="text-sm text-gray-200 mt-1">or drag and drop</div>
            <div class="text-xs text-gray-300 mt-2">
              PDF, DOC, DOCX, TXT (max 5MB)
            </div>
          </label>
        </div>

        <div v-else class="text-white">
          <div class="mb-2">
            <svg
              class="w-8 h-8 mx-auto text-green-300"
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
          <div class="text-sm">{{ uploadedFile.name }}</div>
          <div class="text-xs text-gray-200 mt-1">
            {{ formatFileSize(uploadedFile.size) }}
          </div>
          <button
            @click="removeFile"
            class="mt-2 text-xs text-red-300 hover:text-red-200 transition-colors"
          >
            Remove file
          </button>
        </div>
      </div>

      <div v-if="uploadError" class="mt-3 text-red-300 text-sm">
        {{ uploadError }}
      </div>
    </div>

    <!-- Resume Review Section -->
    <div
      class="backdrop-blur-md bg-white bg-opacity-30 border border-white border-opacity-30 rounded-2xl p-6"
    >
      <h2 class="text-white text-md font-semibold mb-4 flex items-center">
        <svg
          class="w-5 h-5 mr-2"
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
        Resume Review
      </h2>

      <div v-if="!analysisData && !isAnalyzing" class="space-y-3">
        <div class="text-white text-md">
          <div class="mb-2 flex items-center">
            <svg
              class="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            Analysis Status:
          </div>
          <div class="text-sm text-gray-200">
            {{
              uploadedFile
                ? "Ready to analyze"
                : "Upload a resume to get started"
            }}
          </div>
        </div>

        <div v-if="uploadedFile" class="pt-2">
          <button
            @click="analyzeResume"
            :disabled="isAnalyzing"
            class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
          >
            Analyze Resume
          </button>
        </div>
      </div>

      <div v-if="isAnalyzing" class="space-y-3">
        <div class="text-white text-md">
          <div class="mb-2 flex items-center">
            <svg
              class="w-4 h-4 mr-2 animate-spin"
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
            Analysis Status:
          </div>
          <div class="text-sm text-gray-200">
            Analyzing your resume with AI. This may take a few moments.
          </div>
        </div>

        <div class="w-full bg-gray-200 bg-opacity-30 rounded-full h-2">
          <div
            class="bg-blue-500 h-2 rounded-full animate-pulse"
            style="width: 60%"
          ></div>
        </div>
      </div>

      <div v-if="analysisData" class="space-y-4">
        <div class="text-white text-md">
          <div class="mb-2 flex items-center">
            <svg
              class="w-4 h-4 mr-2 text-green-300"
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
            Analysis Complete
          </div>
        </div>

        <div class="bg-white bg-opacity-20 rounded-lg p-4 space-y-3">
          <div class="text-white">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm">Overall Score:</span>
              <span class="text-xl font-bold"
                >{{ analysisData.overall?.score || 0 }}/100</span
              >
            </div>
            <div class="w-full bg-gray-200 bg-opacity-30 rounded-full h-2">
              <div
                class="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                :style="{ width: `${analysisData.overall?.score || 0}%` }"
              ></div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="bg-white bg-opacity-10 rounded-lg p-2">
              <div class="text-xs text-gray-200">Structure</div>
              <div class="font-semibold text-white">
                {{ analysisData.structure?.score || 0 }}
              </div>
            </div>
            <div class="bg-white bg-opacity-10 rounded-lg p-2">
              <div class="text-xs text-gray-200">Content</div>
              <div class="font-semibold text-white">
                {{ analysisData.content?.score || 0 }}
              </div>
            </div>
            <div class="bg-white bg-opacity-10 rounded-lg p-2">
              <div class="text-xs text-gray-200">ATS</div>
              <div class="font-semibold text-white">
                {{ analysisData.ats?.score || 0 }}
              </div>
            </div>
          </div>

          <div class="text-white">
            <div class="text-sm text-gray-200 mb-2">Summary:</div>
            <div class="text-sm">
              {{ analysisData.overall?.summary || "No summary available" }}
            </div>
          </div>

          <div class="flex space-x-2">
            <button
              @click="showDetailedAnalysis"
              class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg transition-colors text-sm font-medium"
            >
              View Details
            </button>
            <button
              @click="analyzeResume"
              class="bg-gray-600 hover:bg-gray-700 text-white py-2 px-3 rounded-lg transition-colors text-sm"
            >
              Re-analyze
            </button>
          </div>
        </div>
      </div>

      <div v-if="analysisError" class="mt-3 text-red-300 text-sm">
        <div class="flex items-start">
          <svg
            class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          {{ analysisError }}
        </div>
      </div>
    </div>

    <!-- Analysis Popup Component -->
    <AnalysisPopup
      :visible="showPopup"
      :analysisData="analysisData"
      @close="showPopup = false"
    />
  </div>
</template>

<script>
import llmService from "../services/llmService.js";
import AnalysisPopup from "./AnalysisPopup.vue";

export default {
  name: "ResumeUploadReview",
  components: {
    AnalysisPopup,
  },
  data() {
    return {
      uploadedFile: null,
      uploadError: null,
      isDragOver: false,
      isAnalyzing: false,
      analysisData: null,
      analysisError: null,
      showPopup: false,
      useMockMode: false, // Use real Anthropic AI by default
    };
  },
  mounted() {
    // API key is configured via environment variables
    this.useMockMode = false;
  },
  methods: {
    handleFileSelect(event) {
      const file = event.target.files[0];
      if (file) {
        this.processFile(file);
      }
    },

    onDragOver(event) {
      this.isDragOver = true;
    },

    onDragLeave(event) {
      this.isDragOver = false;
    },

    onDrop(event) {
      this.isDragOver = false;
      const files = event.dataTransfer.files;
      if (files.length > 0) {
        this.processFile(files[0]);
      }
    },

    processFile(file) {
      this.uploadError = null;
      this.analysisData = null;
      this.analysisError = null;

      try {
        llmService.validateFile(file);
        this.uploadedFile = file;
        this.$emit("file-uploaded", file);
      } catch (error) {
        this.uploadError = error.message;
        this.uploadedFile = null;
      }
    },

    removeFile() {
      this.uploadedFile = null;
      this.analysisData = null;
      this.analysisError = null;
      this.uploadError = null;
      this.$refs.fileInput.value = "";
      this.$emit("file-removed");
    },

    async analyzeResume() {
      if (!this.uploadedFile) {
        this.analysisError = "Please upload a resume first.";
        return;
      }

      this.isAnalyzing = true;
      this.analysisError = null;
      this.analysisData = null;

      try {
        // Extract text from file
        const resumeText = await llmService.extractTextFromFile(
          this.uploadedFile,
        );

        // Use real AI analysis with Anthropic Claude
        const analysis = await llmService.analyzeResume(resumeText);

        this.analysisData = analysis;
        this.$emit("analysis-complete", analysis);
      } catch (error) {
        console.error("Analysis error:", error);
        this.analysisError =
          error.message || "Failed to analyze resume. Please try again.";
      } finally {
        this.isAnalyzing = false;
      }
    },

    showDetailedAnalysis() {
      this.showPopup = true;
    },

    formatFileSize(bytes) {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    },
  },
  emits: ["file-uploaded", "file-removed", "analysis-complete"],
};
</script>

<style scoped>
/* Additional custom styles if needed */
</style>
