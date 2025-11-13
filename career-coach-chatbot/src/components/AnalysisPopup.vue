<template>
  <div
    v-if="visible"
    class="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
    style="
      margin: 0;
      padding: 0;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
    "
    @click="closePopup"
  >
    <div
      class="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
      @click.stop
    >
      <!-- Header -->
      <div class="text-white p-6" style="background-color: #00346d">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold">Resume Analysis Results</h2>
            <p class="text-gray-200 mt-1">
              Detailed feedback and recommendations
            </p>
          </div>
          <button
            @click="closePopup"
            class="text-white hover:text-gray-200 transition-colors"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        <!-- Overall Score -->
        <div class="mt-6 text-center">
          <div class="text-4xl font-bold">
            {{ analysisData.overall?.score || 0 }}/100
          </div>
          <div class="text-gray-200 mt-2">
            {{ analysisData.overall?.summary || "" }}
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto" style="max-height: calc(80vh - 320px)">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Structure Analysis -->
          <div class="bg-gray-50 rounded-xl p-5">
            <div class="flex items-center mb-4">
              <div
                class="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                style="background-color: #e3f2fd"
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="#00346D"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z"
                  ></path>
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-gray-800">Structure</h3>
                <div class="text-2xl font-bold" style="color: #00346d">
                  {{ analysisData.structure?.score || 0 }}/100
                </div>
              </div>
            </div>

            <div class="mb-3">
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                  class="h-2 rounded-full transition-all duration-500"
                  style="background-color: #00346d"
                  :style="{ width: `${analysisData.structure?.score || 0}%` }"
                ></div>
              </div>
            </div>

            <div class="space-y-2">
              <h4 class="font-medium text-gray-700 text-sm">
                Areas for Improvement:
              </h4>
              <ul class="space-y-1">
                <li
                  v-for="(improvement, index) in analysisData.structure
                    ?.improvements || []"
                  :key="`structure-${index}`"
                  class="text-sm text-gray-600 flex items-start"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full mt-2 mr-2 flex-shrink-0"
                    style="background-color: #00346d; opacity: 0.6"
                  ></span>
                  {{ improvement }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Content Analysis -->
          <div class="bg-gray-50 rounded-xl p-5">
            <div class="flex items-center mb-4">
              <div
                class="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                style="background-color: #e8f5e8"
              >
                <svg
                  class="w-5 h-5 text-green-600"
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
              <div>
                <h3 class="font-semibold text-gray-800">Content</h3>
                <div class="text-2xl font-bold text-green-600">
                  {{ analysisData.content?.score || 0 }}/100
                </div>
              </div>
            </div>

            <div class="mb-3">
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                  class="bg-green-600 h-2 rounded-full transition-all duration-500"
                  :style="{ width: `${analysisData.content?.score || 0}%` }"
                ></div>
              </div>
            </div>

            <div class="space-y-2">
              <h4 class="font-medium text-gray-700 text-sm">
                Areas for Improvement:
              </h4>
              <ul class="space-y-1">
                <li
                  v-for="(improvement, index) in analysisData.content
                    ?.improvements || []"
                  :key="`content-${index}`"
                  class="text-sm text-gray-600 flex items-start"
                >
                  <span
                    class="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"
                  ></span>
                  {{ improvement }}
                </li>
              </ul>
            </div>
          </div>

          <!-- ATS Analysis -->
          <div class="bg-gray-50 rounded-xl p-5">
            <div class="flex items-center mb-4">
              <div
                class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3"
              >
                <svg
                  class="w-5 h-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                  ></path>
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-gray-800">ATS Compatibility</h3>
                <div class="text-2xl font-bold text-purple-600">
                  {{ analysisData.ats?.score || 0 }}/100
                </div>
              </div>
            </div>

            <div class="mb-3">
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                  class="bg-purple-600 h-2 rounded-full transition-all duration-500"
                  :style="{ width: `${analysisData.ats?.score || 0}%` }"
                ></div>
              </div>
            </div>

            <div class="space-y-2">
              <h4 class="font-medium text-gray-700 text-sm">
                Areas for Improvement:
              </h4>
              <ul class="space-y-1">
                <li
                  v-for="(improvement, index) in analysisData.ats
                    ?.improvements || []"
                  :key="`ats-${index}`"
                  class="text-sm text-gray-600 flex items-start"
                >
                  <span
                    class="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 mr-2 flex-shrink-0"
                  ></span>
                  {{ improvement }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Action Items -->
        <div class="mt-6 rounded-xl p-4" style="background-color: #f3f8ff">
          <h3 class="font-semibold text-gray-800 mb-3 flex items-center">
            <svg
              class="w-5 h-5 mr-2"
              fill="none"
              stroke="#00346D"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            Next Steps
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-white rounded-lg p-3">
              <h4 class="font-medium text-gray-700 mb-2 text-sm">
                Priority Improvements
              </h4>
              <ul class="space-y-1 text-sm text-gray-600">
                <li v-if="getLowestScore().category" class="flex items-start">
                  <span
                    class="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"
                  ></span>
                  Focus on {{ getLowestScore().category }} ({{
                    getLowestScore().score
                  }}/100)
                </li>
                <li class="flex items-start">
                  <span
                    class="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 mr-2 flex-shrink-0"
                  ></span>
                  Review top suggestions from each category
                </li>
              </ul>
            </div>
            <div class="bg-white rounded-lg p-3">
              <h4 class="font-medium text-gray-700 mb-2 text-sm">Resources</h4>
              <ul class="space-y-1 text-sm text-gray-600">
                <li class="flex items-start">
                  <span
                    class="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"
                  ></span>
                  Use chat for specific questions
                </li>
                <li class="flex items-start">
                  <span
                    class="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"
                  ></span>
                  Re-upload after changes to track progress
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
        <button
          @click="closePopup"
          class="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          Close
        </button>
        <button
          @click="downloadReport"
          class="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors flex items-center text-sm"
          style="background-color: #00346d"
        >
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
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            ></path>
          </svg>
          Download Report
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "AnalysisPopup",
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    analysisData: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: ["close"],
  methods: {
    closePopup() {
      this.$emit("close");
    },
    getLowestScore() {
      const scores = [
        {
          category: "structure",
          score: this.analysisData.structure?.score || 0,
        },
        { category: "content", score: this.analysisData.content?.score || 0 },
        {
          category: "ATS compatibility",
          score: this.analysisData.ats?.score || 0,
        },
      ];
      return scores.reduce((lowest, current) =>
        current.score < lowest.score ? current : lowest,
      );
    },
    downloadReport() {
      const reportData = {
        timestamp: new Date().toISOString(),
        analysis: this.analysisData,
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "resume-analysis-report.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  },
};
</script>

<style scoped>
/* Additional custom styles if needed */
</style>
