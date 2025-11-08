import { perplexity } from '@ai-sdk/perplexity';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { GenAIConfig, NodeData } from '@/app/lib/types/workflow';
import { ExecutionContext, GenAIExecutionResult, ExecutionError } from '../types/execution';
import { GenAIIntent } from '@/app/lib/types/workflow';
import { ModuleExecutionResult, NodeExecutionData } from '../types/execution';

export class GenAINodeExecutor {
  private config: GenAIConfig;

  constructor(nodeData: NodeData & { genAIConfig?: GenAIConfig }) {
    if (!nodeData.genAIConfig) {
      throw new Error('GenAI configuration is missing');
    }
    // Validate that required fields are present
    if (!nodeData.genAIConfig.model || !nodeData.genAIConfig.apiKey) {
      throw new Error('GenAI configuration is incomplete: model and apiKey are required');
    }
    this.config = nodeData.genAIConfig;
  }

  /**
   * Validates the GenAI node configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.model) {
      errors.push('Model is required');
    }

    if (!this.config.apiKey) {
      errors.push('API key is required');
    }

    // Validate supported models
    const supportedModels = [
      'sonar-pro', 'sonar', 'sonar-pro-online', 'sonar-pro-chat',
      'gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'
    ];
    
    if (this.config.model && !supportedModels.includes(this.config.model)) {
      errors.push(`Model "${this.config.model}" is not supported. Supported models are: ${supportedModels.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Executes GenAI node in INTENT DETECTION mode
   * Analyzes user message and detects intent + extracts data
   */
  async execute(message: string, context: ExecutionContext): Promise<GenAIExecutionResult> {
    const systemPrompt = this.getIntentDetectionPrompt();
    return this.executeWithPrompt(message, context, systemPrompt, 'intent_detection');
  }

  /**
   * Executes GenAI node in RESPONSE FORMATTING mode
   * Formats module JSON output into natural language response
   */
  async formatModuleResponse(
    moduleResult: ModuleExecutionResult,
    executionData: NodeExecutionData,
    context: ExecutionContext
  ): Promise<GenAIExecutionResult> {
    // Build formatting prompt with module context
    const systemPrompt = this.getResponseFormattingPrompt(moduleResult, executionData);
    
    // Create a user message that describes what to format
    const formattingMessage = this.buildFormattingMessage(moduleResult, executionData);
    
    // Execute with formatting prompt and store executionData for parsing
    const result = await this.executeWithPrompt(formattingMessage, context, systemPrompt, 'response_formatting');
    
    // Parse with executionData context
    return this.parseFormattingResult(result.response, executionData);
  }

  /**
   * Core execution method with custom prompt
   */
  private async executeWithPrompt(
    message: string,
    context: ExecutionContext,
    systemPrompt: string,
    mode: 'intent_detection' | 'response_formatting'
  ): Promise<GenAIExecutionResult> {
    const { conversationHistory } = context;
    const temperature = 0.2; // Low temperature for consistent responses
    let text: string;

    // Determine AI provider based on model
    const model = this.config.model!;
    const apiKey = this.config.apiKey!;
    
    const isPerplexity = model.startsWith('sonar') || ['sonar', 'sonar-pro', 'sonar-pro-online', 'sonar-pro-chat'].includes(model);
    const isGemini = model.startsWith('gemini-');

    if (!isPerplexity && !isGemini) {
      throw {
        code: 'GENAI_EXECUTION_ERROR',
        message: `Unsupported model: ${model}. Supported models are: sonar-pro, gemini-pro, gemini-1.5-pro, gemini-1.5-flash`,
        timestamp: Date.now(),
      } as ExecutionError;
    }

    // Temporarily set API key as environment variable for SDK
    const envVarName = isPerplexity ? 'PERPLEXITY_API_KEY' : 'GOOGLE_GENERATIVE_AI_API_KEY';
    const originalApiKey = process.env[envVarName];
    process.env[envVarName] = apiKey;

    try {
      let modelProvider;
      if (isPerplexity) {
        modelProvider = perplexity(model as any);
      } else if (isGemini) {
        modelProvider = google(model as 'gemini-pro' | 'gemini-1.5-pro' | 'gemini-1.5-flash');
      } else {
        throw new Error(`Unsupported model: ${model}`);
      }

      // Prepare messages array for AI SDK
      let messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

      // For response formatting mode, use minimal conversation history (last few messages for context)
      // For intent detection mode, use full conversation history
      const historyToUse = mode === 'response_formatting' 
        ? conversationHistory.slice(-4) // Last 2 exchanges for context
        : conversationHistory;

      // Add conversation history (filter out empty messages)
      for (const msg of historyToUse) {
        if (msg.content && typeof msg.content === 'string' && msg.content.trim().length > 0) {
          messages.push({
            role: msg.role,
            content: msg.content.trim(),
          });
        }
      }

      // Add current message
      if (message && message.trim().length > 0) {
        messages.push({
          role: 'user' as const,
          content: message.trim(),
        });
      }

      // Validate and fix message alternation if needed
      const fixedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      for (let i = 0; i < messages.length; i++) {
        const current = messages[i];
        const previous = fixedMessages[fixedMessages.length - 1];

        if (!previous) {
          if (current.role === 'user') {
            fixedMessages.push(current);
          } else {
            console.warn('[GenAINodeExecutor] First message is assistant, skipping:', current.content.substring(0, 50));
          }
        } else {
          if (current.role !== previous.role) {
            fixedMessages.push(current);
          } else {
            console.warn('[GenAINodeExecutor] Consecutive messages with same role detected. Merging content.');
            fixedMessages[fixedMessages.length - 1] = {
              role: previous.role,
              content: previous.content + '\n\n' + current.content,
            };
          }
        }
      }

      // Final validation: ensure we have at least one user message
      if (fixedMessages.length === 0) {
        throw {
          code: 'GENAI_EXECUTION_ERROR',
          message: 'No valid messages to send to AI. Conversation history is empty or invalid.',
          timestamp: Date.now(),
        } as ExecutionError;
      }

      // Log message structure for debugging
      console.log(`[GenAINodeExecutor] ${mode} - Message structure:`, {
        mode,
        originalMessageCount: messages.length,
        fixedMessageCount: fixedMessages.length,
        messageRoles: fixedMessages.map((m) => m.role),
        firstMessageRole: fixedMessages[0]?.role,
        lastMessageRole: fixedMessages[fixedMessages.length - 1]?.role,
      });

      // Use fixed messages
      messages = fixedMessages;

      // Call AI API
      const result = await generateText({
        model: modelProvider,
        system: systemPrompt,
        messages,
        temperature,
      });

      text = result.text;
    } catch (error) {
      console.error(`[GenAINodeExecutor] ${mode} execution error:`, error);
      
      throw {
        code: 'GENAI_EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to execute GenAI node',
        details: {
          model: this.config.model,
          mode,
          error: error instanceof Error ? error.stack : String(error),
        },
        timestamp: Date.now(),
      } as ExecutionError;
    } finally {
      // Always restore original API key, even on error
      if (originalApiKey !== undefined) {
        process.env[envVarName] = originalApiKey;
      } else {
        delete process.env[envVarName];
      }
    }

    // Parse result based on mode
    if (mode === 'intent_detection') {
      return this.parseIntentDetectionResult(text);
    } else {
      // For formatting mode, we need to pass executionData
      // But executionData is not available in this scope, so we'll handle it in formatModuleResponse
      return this.parseFormattingResult(text);
    }
  }

  /**
   * Parses intent detection result
   */
  private parseIntentDetectionResult(text: string): GenAIExecutionResult {
    const assistantResponse = text;
    let detectedIntent: GenAIIntent = 'general_query';
    let extractedData: Record<string, unknown> = {};

    // Try to parse JSON response if it's not a general query
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.intent && ['cancellation', 'order_query', 'refund_query'].includes(parsed.intent)) {
          detectedIntent = parsed.intent;
          extractedData = parsed.data || {};
        }
      }
    } catch (parseError) {
      // If JSON parsing fails, treat as general query
      console.debug('Failed to parse JSON from GenAI response, treating as general query:', parseError);
    }

    // Determine response method
    const method: 'GENAI_TO_FRONTEND' | 'FRONTEND_TO_BLITZ' =
      detectedIntent === 'general_query' ? 'GENAI_TO_FRONTEND' : 'FRONTEND_TO_BLITZ';

    console.log('[GenAINodeExecutor] Intent detection result:', {
      intent: detectedIntent,
      extractedData,
      method,
      responseLength: assistantResponse.length,
    });

    return {
      intent: detectedIntent,
      response: assistantResponse,
      extractedData: Object.keys(extractedData).length > 0 ? extractedData : undefined,
      method,
      nodeId: '', // Will be set by workflow executor
      executionTime: 0, // Will be set by workflow executor
    };
  }

  /**
   * Parses formatting result
   */
  private parseFormattingResult(text: string, executionData?: NodeExecutionData): GenAIExecutionResult {
    // For formatting mode, always return as GENAI_TO_FRONTEND with the formatted response
    const genAIResult = executionData?.genAIResult;
    const intent = genAIResult?.intent || 'general_query';

    console.log('[GenAINodeExecutor] Response formatting result:', {
      intent,
      formattedResponseLength: text.length,
      originalModuleData: executionData?.moduleResult?.data,
    });

    return {
      intent,
      response: text, // Formatted natural language response
      extractedData: genAIResult?.extractedData,
      method: 'GENAI_TO_FRONTEND',
      nodeId: '', // Will be set by workflow executor
      executionTime: 0, // Will be set by workflow executor
    };
  }

  /**
   * Builds formatting message for GenAI
   */
  private buildFormattingMessage(
    moduleResult: ModuleExecutionResult,
    executionData: NodeExecutionData
  ): string {
    const originalMessage = executionData.originalMessage;
    const moduleData = moduleResult.data || {};
    const moduleType = moduleResult.moduleType;

    // Build a message that describes what happened and what data to format
    let message = `The user asked: "${originalMessage}"\n\n`;
    message += `A ${moduleType} module was executed and returned the following data:\n`;
    message += JSON.stringify(moduleData, null, 2);
    message += `\n\nPlease provide a natural, helpful response to the user based on this data. `;
    message += `Be conversational and friendly. If the operation was successful, confirm it. `;
    message += `If there are errors, explain them clearly.`;

    return message;
  }

  /**
   * Gets system prompt for intent detection mode
   */
  private getIntentDetectionPrompt(): string {
    return `You are an intent detection system for an e-commerce chatbot. Your task is to analyze user messages and categorize them into one of these intents:

1. **general_query**: General questions, greetings, or non-actionable queries that can be answered directly
2. **cancellation**: Requests to cancel an order
3. **order_query**: Questions about order status, tracking, or order details
4. **refund_query**: Requests for refunds or questions about refunds

For general queries, provide a helpful, concise answer directly.
For other intents, extract relevant information (like order IDs, product names, etc.) and respond in JSON format.

Response format:
- If general_query: Return a simple text response
- If other intent: Return JSON with this structure:
{
  "intent": "cancellation" | "order_query" | "refund_query",
  "data": {
    "orderId": "string (if mentioned)",
    "reason": "string (if mentioned)",
    "productName": "string (if mentioned)",
    // any other relevant extracted data
  }
}`;
  }

  /**
   * Gets system prompt for response formatting mode
   */
  private getResponseFormattingPrompt(
    moduleResult: ModuleExecutionResult,
    executionData: NodeExecutionData
  ): string {
    const originalMessage = executionData.originalMessage;
    const moduleType = moduleResult.moduleType;
    const genAIResult = executionData.genAIResult;
    const intent = genAIResult?.intent || 'general_query';

    let prompt = `You are a helpful e-commerce chatbot assistant. Your task is to format module execution results into natural, conversational responses for users.\n\n`;
    
    prompt += `**Context:**\n`;
    prompt += `- User's original question: "${originalMessage}"\n`;
    prompt += `- Detected intent: ${intent}\n`;
    prompt += `- Module executed: ${moduleType}\n`;
    
    if (genAIResult?.extractedData) {
      prompt += `- Extracted information: ${JSON.stringify(genAIResult.extractedData, null, 2)}\n`;
    }
    
    prompt += `\n**Your task:**\n`;
    prompt += `The ${moduleType} module has returned data (shown in the user's message). `;
    prompt += `Format this data into a natural, helpful response that:\n`;
    prompt += `1. Acknowledges the user's request\n`;
    prompt += `2. Provides the information or confirms the action taken\n`;
    prompt += `3. Is conversational and friendly\n`;
    prompt += `4. Handles errors gracefully if the module execution failed\n\n`;
    
    prompt += `**Guidelines:**\n`;
    prompt += `- Be concise but informative\n`;
    prompt += `- Use natural language, not technical jargon\n`;
    prompt += `- If data contains orders, list them clearly\n`;
    prompt += `- If an action was successful, confirm it clearly\n`;
    prompt += `- If there's an error, explain it in user-friendly terms\n`;
    prompt += `- Maintain the conversational tone of the chat\n`;

    return prompt;
  }

  /**
   * Tests the GenAI node configuration with a sample message
   */
  async test(message: string = 'Hello, where is my order?'): Promise<GenAIExecutionResult> {
    const testContext: ExecutionContext = {
      businessId: 'test',
      userId: 'test',
      workflowId: 'test',
      chatSessionId: 'test',
      conversationHistory: [],
      originalMessage: message,
      executionId: `test_${Date.now()}`,
      startTime: Date.now(),
    };

    return this.execute(message, testContext);
  }
}
