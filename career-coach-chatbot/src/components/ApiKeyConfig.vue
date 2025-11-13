<template>
  <div
    v-if="showConfig"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    @click="closeConfig"
  >
    <div
      class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
      @click.stop
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-800">API Configuration</h2>
          <p class="text-sm text-gray-600 mt-1">
            Configure your Anthropic API key for resume analysis
          </p>
        </div>
        <button
          @click="closeConfig"
          class="text-gray-400 hover:text-gray-600 transition-colors"
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

      <!-- API Key Input -->
      <div class="mb-6">
        <label
          for="api-key"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          Anthropic API Key
        </label>
        <div class="relative">
          <input
            id="api-key"
            v-model="apiKey"
            :type="showApiKey ? 'text' : 'password'"
            placeholder="sk-ant-..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
          />
          <button
            @click="toggleApiKeyVisibility"
            class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            type="button"
          >
            <svg
              v-if="showApiKey"
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M9.878 9.878L12 12m-3-3l1.415-1.414M21 12a9 9 0 01-1.014 4.121m-1.72 2.512a10.05 10.05 0 01-2.266 1.192"
              ></path>
            </svg>
            <svg
              v-else
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              ></path>
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              ></path>
            </svg>
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-2">
          Your API key is stored locally and never sent to our servers
        </p>
      </div>

      <!-- Status -->
      <div
        v-if="configStatus"
        class="mb-4 p-3 rounded-lg"
        :class="
          configStatus.type === 'success'
            ? 'bg-green-50 text-green-700'
            : 'bg-red-50 text-red-700'
        "
      >
        <div class="flex items-center">
          <svg
            v-if="configStatus.type === 'success'"
            class="w-4 h-4 mr-2"
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
          <svg
            v-else
            class="w-4 h-4 mr-2"
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
          <span class="text-sm">{{ configStatus.message }}</span>
        </div>
      </div>

      <!-- Info Box -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div class="flex items-start">
          <svg
            class="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0"
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
          <div class="text-sm text-blue-700">
            <p class="font-medium mb-1">How to get your API key:</p>
            <ol class="list-decimal list-inside space-y-1 text-blue-600">
              <li>
                Visit
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  class="underline hover:text-blue-800"
                  >Anthropic Console</a
                >
              </li>
              <li>Create a new API key</li>
              <li>Copy and paste it here</li>
            </ol>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end space-x-3">
        <button
          @click="closeConfig"
          class="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          Cancel
        </button>
        <button
          @click="saveApiKey"
          :disabled="!apiKey.trim() || isSaving"
          class="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          style="background-color: #00346d"
        >
          {{ isSaving ? "Saving..." : "Save & Continue" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import llmService from "../services/llmService.js";

export default {
  name: "ApiKeyConfig",
  props: {
    showConfig: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["close", "configured"],
  data() {
    return {
      apiKey: "",
      showApiKey: false,
      configStatus: null,
      isSaving: false,
    };
  },
  mounted() {
    // Load existing API key from localStorage
    const savedApiKey = localStorage.getItem("openai_api_key");
    if (savedApiKey) {
      this.apiKey = savedApiKey;
    }
  },
  methods: {
    closeConfig() {
      this.configStatus = null;
      this.$emit("close");
    },

    toggleApiKeyVisibility() {
      this.showApiKey = !this.showApiKey;
    },

    async saveApiKey() {
      if (!this.apiKey.trim()) {
        this.configStatus = {
          type: "error",
          message: "Please enter a valid API key",
        };
        return;
      }

      this.isSaving = true;
      this.configStatus = null;

      try {
        // Set API key in service
        llmService.setApiKey(this.apiKey.trim());

        // Save to localStorage
        localStorage.setItem("openai_api_key", this.apiKey.trim());

        // Test the API key with a simple request
        await this.testApiKey();

        this.configStatus = {
          type: "success",
          message: "API key saved successfully!",
        };

        // Emit configured event after a short delay
        setTimeout(() => {
          this.$emit("configured", { mode: "api", apiKey: this.apiKey.trim() });
          this.closeConfig();
        }, 1500);
      } catch (error) {
        console.error("API key validation error:", error);
        this.configStatus = {
          type: "error",
          message: "Invalid API key. Please check and try again.",
        };
      } finally {
        this.isSaving = false;
      }
    },

    async testApiKey() {
      // Simple test to validate the API key with Anthropic
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey.trim(),
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 10,
          messages: [
            {
              role: "user",
              content: "Hello",
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("Invalid API key");
      }
    },
  },
};
</script>

<style scoped>
/* Additional custom styles if needed */
</style>
