<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Blitz Protocol - Complete Project Documentation

## 1. Overview

Blitz Protocol is a **B2B automation platform for conversational workflows**, designed for e-commerce and SaaS businesses. It combines a GenAI intent-classifier (LLM-powered) layer with a highly visual, modular workflow builder (React Flow canvas). Businesses define custom chatbot flows that automate real customer service tasks (e.g., order tracking, refunds, cancellations) by integrating their APIs, all while providing secure, no/low-code configuration and seamless end-user experience.

---

## 2. Core Architecture

### Components

- **Frontend UI**
  - Next.js app for dashboard, React Flow canvas, and customer chat interface
  - GenAI streaming intent detection and response rendering

- **Backend API**
  - Next.js API routes for orchestrating workflows and session management
  - Supabase PostgreSQL for workflow definitions, user/business data, and node configurations
  - Chat history stored in Supabase (`chat_sessions` and `chat_messages` tables)
  - Node configurations stored separately with encrypted API keys

- **Automation Modules**
  - Each module: an isolated function integrating business APIs (track shipment, trigger refund, cancel order, etc.)
  - Module registry and configuration stored in database, invoked by orchestrator

- **GenAI Layer**
  - Powered by Perplexity AI (Sonar Pro) and Google Gemini (via Vercel AI SDK)
  - Handles natural language understanding, intent detection, and user-friendly responses
  - Supports multiple AI providers: Perplexity (`sonar-pro`) and Google Gemini (`gemini-pro`, `gemini-1.5-pro`, `gemini-1.5-flash`)
  - API keys are stored per workflow in the database (encrypted) for secure, workflow-specific configuration

- **Integration Layer**
  - REST/GraphQL adapters for business logic/APIs
  - Pluggable API SDK for onboarding third-party endpoints

---

## 3. Recommended Tech Stack

### Frontend
- **Next.js** (Vercel deployment)
- **React Flow** (interactive canvas UI for workflow design)
- **TypeScript** (type safety)
- **shadcn/ui + Tailwind CSS** (UI components & styling)
- **Vercel AI SDK** (streaming GenAI integration)

### State/Session Management
- **Upstash Redis** (session context, temp data)
- **Supabase PostgreSQL** (persistent workflow definitions, business/user data)

### Backend APIs
- **Next.js API Routes** (App Router, `/app/api`)
- **Express.js or Fastify** (for custom endpoints, optional)
- **Perplexity AI SDK** (`@ai-sdk/perplexity`) - Sonar Pro model for intent detection
- **Google Gemini SDK** (`@ai-sdk/google`) - Gemini Pro, Gemini 1.5 Pro, Gemini 1.5 Flash models
- **Vercel AI SDK** (`ai`) - Unified interface for AI model interactions
- **Business API Integration SDK** (custom library)

### DevOps/Infra
- **Vercel** (hosting, deployment, API functions)
- **Upstash** (managed Redis, Vercel-native)
- **Supabase** (managed database, auth, file storage)
- **S3 (optional)** (file/log storage if needed)

### Testing/Monitoring
- **Jest + React Testing Library** (unit/integration tests)
- **Sentry** (error monitoring)
- **Vercel Analytics**, **LogRocket** (usage analytics)


## 🎯 Executive Summary

**Blitz Protocol** is a B2B SaaS platform that enables e-commerce businesses to automate customer support through AI-powered conversational workflows. Unlike traditional chatbots that follow rigid scripts, Blitz uses GenAI to understand user intent naturally, then executes complex multi-step automations through a visual workflow builder.

**Key Innovation**: Separation of conversation (GenAI layer) from execution (business logic modules), giving businesses full control while maintaining natural user experience.

***

## 🔍 Problem Statement

### **Current Pain Points**

1. **Traditional Chatbots Are Rigid**
    - Follow decision trees, can't handle natural language variations
    - "Cancel my order" works, but "I changed my mind about that phone case" fails
    - Poor user experience leads to immediate escalation to human agents
2. **Fully-AI Chatbots Lack Control**
    - Products like ChatGPT plugins are black boxes
    - Businesses can't customize workflows or add business logic
    - Security concerns: AI has full access to sensitive systems
3. **Custom Development Is Expensive**
    - Building intent detection + workflow automation from scratch
    - Each business reinvents the wheel
    - 6-12 months development time + ongoing maintenance

### **Our Solution**

Blitz Protocol provides:

- ✅ **Natural Language Interface**: GenAI understands intent like "Where's my stuff?" → TRACK_SHIPMENT
- ✅ **Visual Workflow Control**: Businesses design automation logic with no-code canvas
- ✅ **Secure Integration**: Business APIs called only after intent is confirmed
- ✅ **Plug-and-Play**: 2-week integration vs 6-month custom build

***

## 🏗️ System Architecture

### **High-Level Architecture**

```
┌──────────────────────────────────────────────────────────────┐
│                      USER INTERFACE                          │
│  (Customer facing - Chat widget embedded in e-commerce site) │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                   BLITZ PROTOCOL PLATFORM                    │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │  LAYER 1: GenAI Intent Detection & NLP                   │ │
│ │  - Analyzes user messages in natural language            │ │
│ │  - Extracts intent (TRACK, CANCEL, REFUND, etc.)         │ │
│ │  - Identifies entities (order ID, product name, date)    │ │
│ │  - Maintains conversation context                        │ │
│ │  - Formats responses in friendly language                │ │
│ └──────────────────────────────────────────────────────────┘ │
│                         │                                      │
│                         ▼                                      │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │  LAYER 2: Orchestration Engine                           │ │
│ │  - Routes intent to correct workflow                     │ │
│ │  - Manages multi-step execution state                    │ │
│ │  - Handles conditional branching (if/else logic)         │ │
│ │  - Coordinates between modules                           │ │
│ │  - Decides: GenAI response or direct UI update           │ │
│ └──────────────────────────────────────────────────────────┘ │
│                         │                                      │
│                         ▼                                      │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │  LAYER 3: Business Modules (Automation Logic)            │ │
│ │  - Pre-built modules: Tracking, Cancel, Refund, etc.     │ │
│ │  - Custom modules created via React Flow canvas          │ │
│ │  - Each module = reusable automation block               │ │
│ │  - Validates data, transforms formats                    │ │
│ │  - Calls business APIs with proper authentication        │ │
│ └──────────────────────────────────────────────────────────┘ │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│              BUSINESS SYSTEMS (Customer's Infrastructure)    │
│  - Order Management APIs                                     │
│  - Inventory System                                          │
│  - Payment Gateway                                           │
│  - CRM Database                                              │
│  - Shipping Provider APIs                                    │
└──────────────────────────────────────────────────────────────┘
```


***

## 🔄 Detailed Workflow Explanation

### **Example Flow: Customer Wants to Track Shipment**

Let me walk through exactly what happens when a customer types "Where is my phone case?"

#### **Step 1: User Input Capture**

```
User types: "Where is my phone case?"
Frontend: Sends to POST /api/chat
Data sent: {
  userId: "user_123",
  message: "Where is my phone case?",
  sessionId: "sess_xyz789"
}
```


#### **Step 2: Context Retrieval**

```typescript
// Backend fetches conversation history from Redis
const context = await redis.get(`session:sess_xyz789`);

// Context contains:
{
  sessionId: "sess_xyz789",
  userId: "user_123",
  messages: [
    { role: "user", content: "Hi", timestamp: 1699350000 },
    { role: "assistant", content: "Hello! How can I help?", timestamp: 1699350001 }
  ],
  extractedEntities: {},
  currentIntent: null,
  activeModule: null
}
```


#### **Step 3: GenAI Intent Detection**

```typescript
// Load GenAI node configuration from database (includes decrypted API key)
import { getWorkflowGenAINode } from '@/app/lib/nodes/utils/workflow-loader';
import { GenAINodeExecutor } from '@/app/lib/nodes/executors';

// Get workflow and GenAI node configuration (validates API key is working)
const { workflow, genAINode } = await getWorkflowGenAINode(businessId);
// This function:
// 1. Loads workflow from database
// 2. Finds GenAI node
// 3. Validates API key is working (tests it)
// 4. Decrypts API key from database
// 5. Returns workflow + GenAI config

// Get chat history (before saving new message to avoid duplication)
const history = await getChatHistory(chatSession.id);
const conversationHistory = history
  .filter((msg) => msg.content && msg.content.trim().length > 0)
  .map((msg) => ({
    role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: msg.content.trim(),
  }));

// Save user message to database
await saveChatMessage(chatSession.id, 'user', message);

// Create executor with configuration from database
const executor = new GenAINodeExecutor({
  genAIConfig: genAINode.genAIConfig,  // Contains decrypted API key and model
});

// Execute intent detection
const result = await executor.execute(message, {
  businessId,
  userId,
  workflowId: workflow.id,
  chatSessionId: chatSession.id,
  conversationHistory,  // Previous messages for context
});

// Result contains:
// {
//   intent: "order_query" | "cancellation" | "refund_query" | "general_query",
//   response: "AI-generated response",
//   extractedData: { orderId: "...", product: "..." },
//   method: "GENAI_TO_FRONTEND" | "FRONTEND_TO_BLITZ"
// }

// Save assistant response to database
await saveChatMessage(
  chatSession.id,
  'assistant',
  result.response,
  result.intent,
  result.extractedData || null
);
```

**Key Implementation Details:**

1. **API Key Loading**: API keys are loaded from the `node_configurations` table and decrypted on-demand
2. **API Key Validation**: API keys are tested with actual API calls before use to ensure they work
3. **Model Selection**: Supports Perplexity (`sonar-pro`) and Google Gemini (`gemini-pro`, `gemini-1.5-pro`, `gemini-1.5-flash`)
4. **Temperature**: Fixed at 0.2 for consistent intent detection (not user-configurable)
5. **System Prompt**: Uses optimized default prompt for intent classification (not user-configurable)
6. **Workflow-Specific**: Each workflow uses its own API key and model configuration
7. **Environment Variables**: API keys are NOT read from environment variables - they come from the database
8. **Message Alternation**: Messages are validated and fixed to ensure proper alternation (user → assistant → user)
9. **Conversation Context**: Previous messages are included for context in intent detection
10. **Error Handling**: Clear error messages if API key is invalid or configuration is missing

**Example Result:**
```typescript
{
  intent: "order_query",
  response: "I can help you track your phone case order. Let me look that up for you...",
  extractedData: {
    product: "phone case"
  },
  method: "FRONTEND_TO_BLITZ"  // Routes to module for order tracking
}
```


#### **Step 4: Orchestration - Route to Module**

```typescript
// Orchestrator identifies which module to call
const moduleId = mapIntentToModule(intent.intent);
// Result: "ShipmentTrackingModule"

// Update session context
await redis.set(`session:sess_xyz789`, {
  ...context,
  currentIntent: intent,
  activeModule: "ShipmentTrackingModule",
  extractedEntities: { product: "phone case" }
});

// Invoke module
const moduleResult = await executeModule("ShipmentTrackingModule", {
  userId: "user_123",
  intent: intent,
  entities: { product: "phone case" }
});
```


#### **Step 5: Module Execution - Call Business API**

```typescript
// ShipmentTrackingModule logic
class ShipmentTrackingModule {
  async execute({ userId, intent, entities }) {
    // Step 5a: Get user's active orders
    const ordersResponse = await fetch(
      `https://business-api.com/api/orders?userId=${userId}&status=in_transit`,
      {
        headers: {
          'Authorization': `Bearer ${BUSINESS_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const orders = await ordersResponse.json();
    
    // Business API returns:
    [
      {
        orderId: "ORD-456",
        product: "Phone Case - Midnight Blue",
        status: "in_transit",
        orderDate: "2025-11-05",
        estimatedDelivery: "2025-11-08"
      },
      {
        orderId: "ORD-789",
        product: "USB Charger",
        status: "in_transit",
        orderDate: "2025-11-04",
        estimatedDelivery: "2025-11-09"
      },
      {
        orderId: "ORD-101",
        product: "Screen Protector",
        status: "in_transit",
        orderDate: "2025-11-03",
        estimatedDelivery: "2025-11-10"
      }
    ]
    
    // Step 5b: Filter by product mention
    const matchingOrders = orders.filter(order => 
      order.product.toLowerCase().includes(entities.product.toLowerCase())
    );
    
    // Found: ORD-456 (Phone Case)
    
    return {
      type: "STRUCTURED_DATA",
      displayType: "order_list",
      data: matchingOrders
    };
  }
}
```


#### **Step 6: Response Strategy Decision**

```typescript
// Orchestrator decides: Should GenAI respond or send direct UI?

if (moduleResult.type === "STRUCTURED_DATA") {
  // Multiple orders found - show UI list, let user pick
  return {
    flow: "MODULE_TO_FRONTEND",
    data: moduleResult.data,
    uiComponent: "OrderSelectionCard"
  };
} else if (moduleResult.type === "SINGLE_RESULT") {
  // Single order - format with GenAI for friendly response
  return {
    flow: "GENAI_TO_USER",
    data: moduleResult.data
  };
}
```


#### **Step 7: Frontend Rendering**

```typescript
// Frontend receives response
{
  flow: "MODULE_TO_FRONTEND",
  data: [
    {
      orderId: "ORD-456",
      product: "Phone Case - Midnight Blue",
      status: "in_transit",
      estimatedDelivery: "2025-11-08"
    }
  ],
  uiComponent: "OrderSelectionCard"
}

// React component renders:
<OrderSelectionCard>
  <OrderCard
    orderId="ORD-456"
    product="Phone Case - Midnight Blue"
    status="Out for delivery"
    eta="Nov 8, 6:00 PM"
    onClick={() => showDetailedTracking("ORD-456")}
  />
</OrderSelectionCard>
```


#### **Step 8: User Selects Order**

```
User clicks on: ORD-456 card

Frontend sends: {
  sessionId: "sess_xyz789",
  action: "GET_DETAILED_TRACKING",
  orderId: "ORD-456"
}
```


#### **Step 9: Fetch Detailed Tracking**

```typescript
// Module makes second API call
const trackingResponse = await fetch(
  `https://business-api.com/api/orders/ORD-456/tracking`,
  {
    headers: { 'Authorization': `Bearer ${BUSINESS_API_KEY}` }
  }
);

// Business API returns:
{
  orderId: "ORD-456",
  product: "Phone Case - Midnight Blue",
  status: "out_for_delivery",
  currentLocation: "Local Distribution Center",
  estimatedDelivery: "2025-11-08T18:00:00Z",
  trackingEvents: [
    { timestamp: "2025-11-05T10:00:00Z", status: "order_placed", location: "Warehouse" },
    { timestamp: "2025-11-06T14:30:00Z", status: "shipped", location: "Mumbai Hub" },
    { timestamp: "2025-11-07T09:00:00Z", status: "out_for_delivery", location: "Local Center" }
  ],
  trackingUrl: "https://track.shipment.com/ORD-456",
  deliveryAgent: {
    name: "Rajesh Kumar",
    phone: "+91-98765-43210"
  }
}
```


#### **Step 10: GenAI Formats Final Response (Optional)**

**Note**: In the current implementation, GenAI already formats responses during intent detection. Additional formatting can be done if needed:

```typescript
// If additional formatting is needed, the GenAI node already returns a formatted response
// from the executor.execute() call. The response is stored in chat history and returned to the user.

// The GenAI executor uses the configured model (Perplexity or Gemini) with:
// - Temperature: 0.2 (fixed for consistency)
// - System Prompt: Optimized default for intent detection
// - API Key: Loaded from database (decrypted)

// Example formatted response from GenAI:
"Great news! 🚚 Your Phone Case (Midnight Blue) is out for delivery!

📍 Current location: Local Distribution Center
⏰ Expected delivery: Today by 6:00 PM
👤 Delivery agent: Rajesh Kumar

Your package is on its way and should arrive within the next few hours. You can track it in real-time here: [Track Package]

Need anything else? 😊"
```


#### **Step 11: Display to User**

```typescript
// Frontend receives GenAI response and displays in chat
<ChatMessage role="assistant">
  Great news! 🚚 Your Phone Case (Midnight Blue) is out for delivery!
  
  📍 Current location: Local Distribution Center
  ⏰ Expected delivery: Today by 6:00 PM
  👤 Delivery agent: Rajesh Kumar
  
  <TrackingLink href="https://track.shipment.com/ORD-456">
    Track Package
  </TrackingLink>
  
  Need anything else? 😊
</ChatMessage>
```


***

## 🧩 Three Message Flow Types Explained

### **Flow Type 1: USER_TO_GENAI**

**When**: Initial user input, follow-up questions, clarifications

```
User → GenAI → Analysis → Context Update
```

**Example:**

```
User: "I want to return something"
GenAI: Analyzes → Intent: REQUEST_REFUND
GenAI: Needs clarification → "Which order would you like to return?"
```


### **Flow Type 2: MODULE_TO_FRONTEND**

**When**: Showing structured data that doesn't need natural language formatting

```
Module → Direct UI Update (Skip GenAI)
```

**Example:**

```
Module fetches: 5 recent orders
Frontend displays: 5 order cards with product images, prices, dates
(No need for GenAI to say "Here are your orders..." - just show them)
```

**Why skip GenAI?**

- ✅ Faster (no LLM call latency)
- ✅ Better UX (rich UI components vs text)
- ✅ Cheaper (save API costs)
- ✅ More control (exact formatting)


### **Flow Type 3: GENAI_TO_USER**

**When**: Final response needs to be conversational and contextual

```
Module Data → GenAI → Friendly Response → User
```

**Example:**

```
Module returns: { status: "refund_approved", amount: 1299, eta: "3-5 days" }
GenAI formats: "Good news! Your refund of ₹1,299 has been approved. 
               The amount will be credited to your original payment 
               method within 3-5 business days."
```


***

## 🗂️ Project Structure

### **Repository Organization**

```
blitz-protocol/
├── apps/
│   ├── web/                          # Main Next.js application
│   │   ├── app/
│   │   │   ├── (auth)/              # Authentication routes
│   │   │   │   ├── login/
│   │   │   │   └── signup/
│   │   │   ├── (dashboard)/         # Business dashboard
│   │   │   │   ├── workflows/       # Workflow builder (React Flow)
│   │   │   │   ├── analytics/       # Usage metrics
│   │   │   │   └── settings/        # API configs
│   │   │   ├── api/                 # API routes
│   │   │   │   ├── chat/            # Main chat endpoint
│   │   │   │   │   └── route.ts
│   │   │   │   ├── execute-module/  # Module execution
│   │   │   │   │   └── route.ts
│   │   │   │   ├── workflows/       # Workflow CRUD
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── route.ts
│   │   │   │   └── webhooks/        # Business API webhooks
│   │   │   │       └── route.ts
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── chat/                # Chat UI components
│   │   │   │   ├── ChatWindow.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   └── OrderCard.tsx
│   │   │   ├── workflow/            # React Flow components
│   │   │   │   ├── WorkflowCanvas.tsx
│   │   │   │   ├── CustomNodes.tsx
│   │   │   │   └── ModulePalette.tsx
│   │   │   └── ui/                  # Shadcn components
│   │   │       ├── button.tsx
│   │   │       ├── card.tsx
│   │   │       └── ...
│   │   ├── lib/
│   │   │   ├── ai/                  # AI utilities
│   │   │   │   ├── intent-detector.ts
│   │   │   │   ├── openai-client.ts
│   │   │   │   └── context-manager.ts
│   │   │   ├── redis/               # Redis client
│   │   │   │   ├── client.ts
│   │   │   │   └── session.ts
│   │   │   ├── db/                  # Database client (Supabase)
│   │   │   │   ├── client.ts
│   │   │   │   └── schema.ts
│   │   │   └── modules/             # Business modules
│   │   │       ├── base-module.ts
│   │   │       ├── shipment-tracking.ts
│   │   │       ├── order-cancellation.ts
│   │   │       ├── refund-processing.ts
│   │   │       └── index.ts
│   │   └── package.json
│   │
│   └── widget/                       # Embeddable chat widget
│       ├── src/
│       │   ├── BlitzWidget.tsx      # Main widget component
│       │   ├── ChatInterface.tsx
│       │   └── index.ts
│       ├── dist/                     # Built widget
│       │   └── blitz-widget.js
│       └── package.json
│
├── packages/
│   ├── types/                        # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── intent.ts
│   │   │   ├── module.ts
│   │   │   ├── workflow.ts
│   │   │   └── session.ts
│   │   └── package.json
│   │
│   ├── sdk/                          # Client SDK for businesses
│   │   ├── src/
│   │   │   ├── BlitzClient.ts       # Main SDK class
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── config/                       # Shared configs
│       ├── eslint-config/
│       ├── typescript-config/
│       └── tailwind-config/
│
├── docs/                             # Documentation
│   ├── architecture.md
│   ├── api-reference.md
│   ├── module-development.md
│   └── integration-guide.md
│
├── scripts/                          # Utility scripts
│   ├── seed-db.ts                   # Database seeding
│   └── generate-types.ts            # Type generation
│
├── .env.example
├── .gitignore
├── package.json
├── turbo.json                        # Turborepo config
└── README.md
```


***

## 📦 Core Files Explained

### **1. Intent Detector (`lib/ai/intent-detector.ts`)**

```typescript
import { GenAINodeExecutor } from '@/app/lib/nodes/executors';
import { loadWorkflowWithConfigurations } from '@/app/lib/db/workflows';
import { ExecutionContext } from '@/app/lib/nodes/types/execution';

/**
 * Detects intent using GenAI node configuration from database
 * API key is loaded from node_configurations table and decrypted
 */
export async function detectIntent(
  userMessage: string,
  businessId: string,
  workflowId: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{
  intent: 'general_query' | 'cancellation' | 'order_query' | 'refund_query';
  response: string;
  extractedData?: Record<string, unknown>;
  method: 'GENAI_TO_FRONTEND' | 'FRONTEND_TO_BLITZ';
}> {
  // Load workflow with node configurations (includes decrypted API keys)
  const { nodes } = await loadWorkflowWithConfigurations(workflowId);
  const genAINode = nodes.find((node) => node.type === 'genai-intent');

  if (!genAINode || !genAINode.genAIConfig) {
    throw new Error('GenAI node not found or not configured');
  }

  // Create executor with configuration from database
  const executor = new GenAINodeExecutor({
    genAIConfig: genAINode.genAIConfig,  // Contains decrypted API key and model
  });

  // Execute intent detection
  const executionContext: ExecutionContext = {
    businessId,
    userId: 'system',
    conversationHistory,
  };

  const result = await executor.execute(userMessage, executionContext);

  return result;
}
```

**Key Implementation Details:**

1. **Database-First**: Configuration is loaded from `node_configurations` table
2. **Automatic Decryption**: API keys are automatically decrypted when loading configuration
3. **Provider Support**: Supports Perplexity (`sonar-pro`) and Google Gemini models
4. **Fixed Parameters**: Temperature is fixed at 0.2, system prompt is optimized default
5. **Workflow-Specific**: Each workflow uses its own API key and model configuration


### **2. Base Module Class (`lib/modules/base-module.ts`)**

```typescript
import { ModuleConfig, ModuleResult, ExecutionContext } from '@blitz/types';

export abstract class BaseModule {
  protected config: ModuleConfig;
  
  constructor(config: ModuleConfig) {
    this.config = config;
  }

  /**
   * Every module must implement execute method
   * This is where the core automation logic lives
   */
  abstract execute(context: ExecutionContext): Promise<ModuleResult>;

  /**
   * Validate that required APIs are configured
   */
  protected validateAPIs(requiredAPIs: string[]): void {
    const configuredAPIs = Object.keys(this.config.apiConfigs || {});
    const missingAPIs = requiredAPIs.filter(api => !configuredAPIs.includes(api));
    
    if (missingAPIs.length > 0) {
      throw new Error(`Missing API configurations: ${missingAPIs.join(', ')}`);
    }
  }

  /**
   * Make authenticated API call to business system
   */
  protected async callBusinessAPI(
    apiName: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const apiConfig = this.config.apiConfigs[apiName];
    
    if (!apiConfig) {
      throw new Error(`API configuration not found: ${apiName}`);
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${apiConfig.apiKey}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(`${apiConfig.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Log module execution for analytics
   */
  protected async logExecution(
    status: 'success' | 'error',
    duration: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Log to analytics service
    console.log({
      module: this.constructor.name,
      status,
      duration,
      metadata,
      timestamp: Date.now()
    });
  }
}
```


### **3. Shipment Tracking Module (`lib/modules/shipment-tracking.ts`)**

```typescript
import { BaseModule } from './base-module';
import { ModuleResult, ExecutionContext } from '@blitz/types';

export class ShipmentTrackingModule extends BaseModule {
  async execute(context: ExecutionContext): Promise<ModuleResult> {
    const startTime = Date.now();
    
    try {
      // Validate required APIs are configured
      this.validateAPIs(['orders_api']);

      const { userId, intent } = context;
      const { product, orderId } = intent.entities;

      // Step 1: If orderId provided, fetch directly
      if (orderId) {
        const trackingData = await this.getTrackingDetails(orderId);
        
        return {
          type: 'SINGLE_RESULT',
          flow: 'GENAI_TO_USER',
          data: trackingData,
          success: true
        };
      }

      // Step 2: Otherwise, fetch active orders for user
      const activeOrders = await this.callBusinessAPI(
        'orders_api',
        `/orders?userId=${userId}&status=in_transit`,
        { method: 'GET' }
      );

      // Step 3: Filter by product if mentioned
      let matchingOrders = activeOrders;
      if (product) {
        matchingOrders = activeOrders.filter((order: any) =>
          order.product.toLowerCase().includes(product.toLowerCase())
        );
      }

      // Step 4: Return result based on matches
      if (matchingOrders.length === 0) {
        return {
          type: 'NO_RESULTS',
          flow: 'GENAI_TO_USER',
          data: {
            message: 'No active shipments found'
          },
          success: true
        };
      }

      if (matchingOrders.length === 1) {
        // Single order - fetch detailed tracking
        const trackingData = await this.getTrackingDetails(matchingOrders[0].orderId);
        
        return {
          type: 'SINGLE_RESULT',
          flow: 'GENAI_TO_USER',
          data: trackingData,
          success: true
        };
      }

      // Multiple orders - show list for user to pick
      return {
        type: 'STRUCTURED_DATA',
        flow: 'MODULE_TO_FRONTEND',
        data: matchingOrders,
        uiComponent: 'OrderSelectionCard',
        success: true
      };

    } catch (error) {
      await this.logExecution('error', Date.now() - startTime, { error });
      
      return {
        type: 'ERROR',
        flow: 'GENAI_TO_USER',
        data: {
          message: 'Unable to fetch tracking information. Please try again.'
        },
        success: false,
        error: error.message
      };
    } finally {
      await this.logExecution('success', Date.now() - startTime);
    }
  }

  /**
   * Get detailed tracking for specific order
   */
  private async getTrackingDetails(orderId: string) {
    const tracking = await this.callBusinessAPI(
      'orders_api',
      `/orders/${orderId}/tracking`,
      { method: 'GET' }
    );

    return {
      orderId: tracking.orderId,
      product: tracking.product,
      status: tracking.status,
      currentLocation: tracking.currentLocation,
      estimatedDelivery: tracking.estimatedDelivery,
      trackingEvents: tracking.trackingEvents,
      trackingUrl: tracking.trackingUrl,
      deliveryAgent: tracking.deliveryAgent
    };
  }
}
```


### **4. Session Management (`lib/redis/session.ts`)**

```typescript
import { redis } from './client';
import { SessionContext, Message } from '@blitz/types';

const SESSION_TTL = 1800; // 30 minutes in seconds

export async function getSession(sessionId: string): Promise<SessionContext | null> {
  const data = await redis.get<SessionContext>(`session:${sessionId}`);
  return data;
}

export async function createSession(
  sessionId: string,
  userId: string
): Promise<SessionContext> {
  const session: SessionContext = {
    sessionId,
    userId,
    messages: [],
    currentIntent: null,
    extractedEntities: {},
    activeModule: null,
    pendingAction: null,
    createdAt: Date.now(),
    lastActivity: Date.now()
  };

  await redis.setex(`session:${sessionId}`, SESSION_TTL, JSON.stringify(session));
  return session;
}

export async function updateSession(
  sessionId: string,
  updates: Partial<SessionContext>
): Promise<void> {
  const current = await getSession(sessionId);
  
  if (!current) {
    throw new Error('Session not found');
  }

  const updated = {
    ...current,
    ...updates,
    lastActivity: Date.now()
  };

  // Reset TTL on each update (sliding window)
  await redis.setex(`session:${sessionId}`, SESSION_TTL, JSON.stringify(updated));
}

export async function addMessage(
  sessionId: string,
  message: Message
): Promise<void> {
  const session = await getSession(sessionId);
  
  if (!session) {
    throw new Error('Session not found');
  }

  // Add new message
  session.messages.push(message);

  // Keep only last 10 messages (memory optimization)
  if (session.messages.length > 10) {
    session.messages = session.messages.slice(-10);
  }

  await updateSession(sessionId, { messages: session.messages });
}

export async function deleteSession(sessionId: string): Promise<void> {
  await redis.del(`session:${sessionId}`);
}

export async function extendSession(sessionId: string): Promise<void> {
  const session = await getSession(sessionId);
  
  if (session) {
    await redis.expire(`session:${sessionId}`, SESSION_TTL);
  }
}
```


### **5. Main Chat API Route (`app/api/chat/route.ts`)**

```typescript
import { auth } from '@clerk/nextjs/server';
import { getWorkflowGenAINode } from '@/app/lib/nodes/utils/workflow-loader';
import { getOrCreateChatSession, saveChatMessage, getChatHistory } from '@/app/lib/db/chat';
import { GenAINodeExecutor } from '@/app/lib/nodes/executors';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, businessId } = await req.json();

    // Load workflow and GenAI node configuration from database
    const { workflow, genAINode } = await getWorkflowGenAINode(businessId);

    // Get or create chat session
    const chatSession = await getOrCreateChatSession(userId, businessId);

    // Save user message
    await saveChatMessage(chatSession.id, 'user', message);

    // Get conversation history
    const history = await getChatHistory(chatSession.id);
    const conversationHistory = history.map((msg) => ({
      role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.content,
    }));

    // Create execution context
    const executionContext = {
      businessId,
      userId,
      workflowId: workflow.id,
      chatSessionId: chatSession.id,
      conversationHistory,
    };

    // Execute GenAI node (API key is loaded from database and decrypted)
    const nodeData = {
      genAIConfig: genAINode.genAIConfig,  // Contains decrypted API key from DB
    };
    
    const executor = new GenAINodeExecutor(nodeData);
    const executionResult = await executor.execute(message, executionContext);

    // Save assistant response
    await saveChatMessage(
      chatSession.id,
      'assistant',
      executionResult.response,
      executionResult.intent,
      executionResult.extractedData || null
    );

    // Return response
    return Response.json({
      method: executionResult.method,
      intent: executionResult.intent,
      response: executionResult.response,
      data: executionResult.extractedData,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to process message' },
      { status: 500 }
    );
  }
}
```

**Key Changes:**

1. **Database-First Configuration**: GenAI configuration (including API key) is loaded from `node_configurations` table
2. **Automatic Decryption**: API keys are automatically decrypted when loading from database
3. **Chat History**: Conversation history is stored in Supabase (`chat_sessions` and `chat_messages` tables)
4. **Workflow-Specific**: Each workflow uses its own API key and model configuration from the database
5. **No Environment Variables**: API keys are NOT read from environment variables - they come from the database per workflow


### **6. Module Executor (`lib/modules/index.ts`)**

```typescript
import { ShipmentTrackingModule } from './shipment-tracking';
import { OrderCancellationModule } from './order-cancellation';
import { RefundProcessingModule } from './refund-processing';
import { ModuleResult, ExecutionContext } from '@blitz/types';

const moduleRegistry = {
  'TRACK_SHIPMENT': ShipmentTrackingModule,
  'CANCEL_ORDER': OrderCancellationModule,
  'REQUEST_REFUND': RefundProcessingModule,
};

export async function executeModule(
  intentType: string,
  context: ExecutionContext
): Promise<ModuleResult> {
  const ModuleClass = moduleRegistry[intentType];

  if (!ModuleClass) {
    return {
      type: 'ERROR',
      flow: 'GENAI_TO_USER',
      data: {
        message: 'I can help you with tracking, cancellations, and refunds. What would you like to do?'
      },
      success: false
    };
  }

  // Get module configuration from database
  const moduleConfig = await getModuleConfig(context.session.userId, intentType);

  const module = new ModuleClass(moduleConfig);
  return await module.execute(context);
}

async function getModuleConfig(userId: string, intentType: string) {
  // Fetch business-specific API configurations
  // This would query your database for API keys, endpoints, etc.
  return {
    apiConfigs: {
      orders_api: {
        baseUrl: 'https://business-api.com/api',
        apiKey: process.env.BUSINESS_API_KEY,
        timeout: 10000
      }
    }
  };
}
```


***

## 🎨 React Flow Workflow Builder

### **Workflow Builder (Current UI)**

- A business owns exactly one workflow (`workflows` table enforces `UNIQUE (business_id)` in migration `20251107121000_workflow_constraints.sql`).
- Workflows are automatically created when a user first accesses the workflows page via `ensureWorkflowForBusiness()`, which creates a default workflow with core nodes if one doesn't exist.
- The canvas always boots with three non-removable core nodes:
  - **GenAI Intent Layer** – cannot be deleted, contains AI model configuration (Perplexity or Google Gemini). Supports model selection (`sonar-pro` for Perplexity, `gemini-pro`, `gemini-1.5-pro`, `gemini-1.5-flash` for Google). API keys are stored per workflow in the database (encrypted) and loaded dynamically. Temperature is fixed at 0.2 for consistent intent detection, and system prompt uses a default optimized for intent classification.
  - **Router / Orchestrator** – cannot be deleted, mediates calls into modules and receives their results via a single connection port (right side) that all modules connect to. Maps detected intents to specific module nodes.
  - **Response Formatter** – optional clean-up node that modules can connect to if they need to format payloads before hitting the UI. Modules emitting `MODULE_TO_FRONTEND` payloads wire into this node; it feeds back into the router which in turn delivers the UI instruction to the client. The Response Formatter supports three response types: `text` (simple text response), `structured` (JSON data), and `ui-component` (custom UI component with props). Modules connect their output to the Response Formatter, which then formats the data according to the configured response type before sending it to the frontend.
- Additional modules (Order Tracking, Cancellation, FAQ, Refund) are added via a floating "+ Add Module" button (top-right with padding). Each module type can exist only once; once dropped, it disappears from the modal.
- Connections are **manual**. Designers decide which edges exist (e.g., Router ↔ Tracking, Cancellation ↔ Refund). Selecting an edge and pressing Delete/Backspace removes that connection.
- Node handles are positioned on the left (input) and right (output) sides of nodes, not top/bottom.
- GenAI, Router, and Response nodes are marked `deletable: false` inside React Flow; if users attempt to delete them the canvas immediately restores the node.
- Every node/edge change (add/remove/reposition, module config edit) triggers an immediate POST to `/api/workflows`, ensuring Supabase always has the canonical workflow snapshot.
- Node configurations (API keys, model settings, etc.) are stored separately in the `node_configurations` table with encrypted API keys. This allows each workflow to have its own AI provider configuration.
- Module deletion is supported through the config panel's "Delete Module" button or Delete/Backspace on a selected module node. Deleting a module also removes its configuration from the database.

```tsx
// components/workflow/WorkflowCanvas.tsx (excerpt)
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
} from '@xyflow/react';

import { NodeAddModal } from './NodeAddModal';
import { NodeConfigPanel } from './NodeConfigPanel';
import { GenAIIntentNode, RouterNode, ModuleNode, ResponseNode } from './nodes';

const CORE_NODES = [
  { id: 'genai-node', type: 'genai-intent', position: { x: 200, y: 200 } },
  { id: 'router-node', type: 'router', position: { x: 600, y: 200 } },
  { id: 'response-node', type: 'response', position: { x: 1000, y: 200 } },
];

export function WorkflowCanvas({ workflowId, initialNodes, initialEdges }: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(convert(initialNodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(convert(initialEdges));
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ensure core nodes exist + non-deletable flag
  useEffect(() => {
    setNodes((existing) => syncCoreNodes(existing));
  }, []);

  // auto-save to Supabase
  useEffect(() => {
    if (!initialisedRef.current) return;
    persistWorkflow({ workflowId, nodes, edges });
  }, [nodes, edges]);

  const handleAddModule = (moduleType: ModuleType) => {
    setNodes((curr) => [...curr, createModuleNode(moduleType)]);
  };

  const onNodesDelete = (nodesToDelete: Node[]) => {
    // modules can go away; core nodes are restored immediately
    ...
  };

  return (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
      onNodesDelete={handleModuleDeletion}
      connectionMode={ConnectionMode.Loose}
      deleteKeyCode={['Backspace', 'Delete']}
      isValidConnection={validateConnection}
    >
          <Background />
      <Controls />
      <MiniMap />
        </ReactFlow>
    <button className="add-module">+ Add Module</button>
    <NodeAddModal ... />
    <NodeConfigPanel ... />
  );
}
```

### **Workflow API (`/api/workflows`)**

- **Authentication**: Both GET and POST require a signed-in Clerk session. `auth()` aborts with 401 if unauthenticated.
- **Auto-provisioning**: `ensureBusinessForUser(user)` guarantees a business + user row exists in Supabase. If the user is new, the helper inserts a placeholder business and links the Clerk account.
- **GET**
  - Returns `{ business, workflows }`, where `workflows` is an array (max length 1) containing the persisted `react_flow_state` (nodes & edges) for that business.
  - The canvas hydrates itself using this snapshot.
- **POST**
  - Expects `{ workflowId?, nodes, edges, name?, description? }`.
  - Validates array payloads and hands off to `saveWorkflow`, which upserts the row for the current business.
  - Response: `{ workflow }` reflecting the saved row.
  - Used by the canvas for auto-save after every user action.

```ts
// app/api/workflows/route.ts (excerpt)
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const { business } = await ensureBusinessForUser(user);
  const workflows = await listWorkflowsForBusiness(business.id);
  return NextResponse.json({ business, workflows });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) {
    return NextResponse.json({ error: 'Invalid payload. Expected nodes and edges arrays.' }, { status: 400 });
  }

  const workflow = await saveWorkflow({
    workflowId: payload.workflowId,
    businessId: business.id,
    name: payload.name,
    description: payload.description,
    nodes: payload.nodes,
    edges: payload.edges,
  });
  return NextResponse.json({ workflow }, { status: 200 });
}
```


### **Custom Node Example**

```typescript
// components/workflow/CustomNodes.tsx
import { Handle, Position } from 'reactflow';

export const CustomNodes = {
  ModuleNode: ({ data }: { data: any }) => {
    return (
      <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-blue-500">
        <Handle type="target" position={Position.Top} />
        
        <div>
          <div className="font-bold text-sm">{data.label}</div>
          <div className="text-xs text-gray-500">{data.moduleType}</div>
          
          {/* Module configuration */}
          {data.config && (
            <div className="mt-2 text-xs">
              <div>API: {data.config.apiName}</div>
              <div>Timeout: {data.config.timeout}ms</div>
            </div>
          )}
        </div>
        
        <Handle type="source" position={Position.Bottom} />
      </div>
    );
  },

  DecisionNode: ({ data }: { data: any }) => {
    return (
      <div className="px-4 py-2 shadow-md rounded-md bg-yellow-100 border-2 border-yellow-500">
        <Handle type="target" position={Position.Top} />
        
        <div>
          <div className="font-bold text-sm">Decision</div>
          <div className="text-xs">{data.condition}</div>
        </div>
        
        {/* Multiple output handles for branches */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="true"
          style={{ left: '30%' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="false"
          style={{ left: '70%' }}
        />
      </div>
    );
  },

  // ... other node types
};
```


***

## 🔒 Security \& Authentication

### **API Key Management**

API keys for GenAI providers (Perplexity and Google Gemini) are stored per workflow in the `node_configurations` table. Each workflow can have its own AI provider configuration, allowing businesses to use different API keys or providers for different workflows.

```typescript
// Database schema for node configurations
CREATE TABLE node_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  node_id VARCHAR(255) NOT NULL,
  node_type VARCHAR(50) NOT NULL,  -- 'genai-intent', 'router', 'module', 'response'
  config_data JSONB NOT NULL,  -- Contains encrypted API keys and other config
  is_configured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workflow_id, node_id)
);

// Encryption helper (AES-256-CBC with scrypt key derivation)
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SALT_LENGTH = 16;
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

function deriveKey(encryptionKey: string, salt: Buffer): Buffer {
  return scryptSync(encryptionKey, salt, KEY_LENGTH);
}

export function encryptAPIKey(apiKey: string): string {
  const encryptionKey = process.env.API_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('API_ENCRYPTION_KEY environment variable is not set');
  }

  // Generate random salt and IV
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  // Derive key from encryption key and salt
  const key = deriveKey(encryptionKey, salt);

  // Encrypt
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return format: salt:iv:encrypted (all in hex)
  return `${salt.toString('hex')}:${iv.toString('hex')}:${encrypted}`;
}

export function decryptAPIKey(encryptedData: string): string {
  const encryptionKey = process.env.API_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('API_ENCRYPTION_KEY environment variable is not set');
  }

  // Parse the encrypted data
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format. Expected salt:iv:encrypted');
  }

  const [saltHex, ivHex, encryptedHex] = parts;

  // Convert hex strings to buffers
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');

  // Derive key from encryption key and salt
  const key = deriveKey(encryptionKey, salt);

  // Decrypt
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

#### **GenAI Node Configuration**

The GenAI Intent node supports multiple AI providers:

1. **Perplexity AI**
   - Model: `sonar-pro`
   - API Key: Obtained from Perplexity (starts with `pplx-`)
   - Use case: Fast, accurate intent detection

2. **Google Gemini**
   - Models: `gemini-pro`, `gemini-1.5-pro`, `gemini-1.5-flash`
   - API Key: Obtained from [Google AI Studio](https://aistudio.google.com/api-keys) (starts with `AIza`)
   - Use case: Alternative provider with different pricing/performance characteristics

**Configuration Process:**
1. User clicks on GenAI node → Configuration panel opens on the right
2. User selects model from dropdown (Perplexity or Gemini models)
3. User enters API key (encrypted and stored in database)
4. Configuration is saved to `node_configurations` table
5. API key is decrypted when needed for API calls

**Key Features:**
- **Workflow-Specific Keys**: Each workflow has its own API key stored in the database
- **Dynamic Loading**: API keys are loaded from database (decrypted) when executing workflows, not from environment variables
- **Secure Storage**: API keys are encrypted using AES-256-CBC before storing in database
- **Multiple Providers**: Support for both Perplexity and Google Gemini
- **Fixed Temperature**: Temperature is hardcoded to 0.2 for consistent, deterministic intent detection
- **Default System Prompt**: Uses an optimized system prompt for intent classification (not user-configurable)


### **Rate Limiting**

```typescript
// Middleware for API routes
import { redis } from '@/lib/redis/client';

export async function rateLimit(userId: string, limit: number = 100): Promise<boolean> {
  const key = `ratelimit:${userId}:${Date.now() / 60000 | 0}`; // Per minute
  
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, 60); // Expire after 1 minute
  }
  
  return current <= limit;
}

// Usage in API route
export async function POST(req: Request) {
  const { userId } = await req.json();
  
  const allowed = await rateLimit(userId, 100);
  if (!allowed) {
    return Response.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
  }
  
  // Continue with normal processing...
}
```


***

## 📊 Database Schema

### **PostgreSQL Tables**

```sql
-- Businesses (customers of Blitz Protocol)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'starter',  -- starter, growth, enterprise
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users (admins managing workflows for businesses)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',  -- admin, member, viewer
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workflow definitions (React Flow state)
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  react_flow_state JSONB NOT NULL,  -- nodes and edges
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Node configurations (stores GenAI, Router, Module, and Response node configs)
CREATE TABLE node_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  node_id VARCHAR(255) NOT NULL,
  node_type VARCHAR(50) NOT NULL,  -- 'genai-intent', 'router', 'module', 'response'
  config_data JSONB NOT NULL,  -- Contains encrypted API keys and other config
  is_configured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workflow_id, node_id)
);

-- Chat sessions (for storing conversation history)
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,  -- Clerk user ID
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat messages (for storing individual messages in sessions)
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,  -- 'user' or 'assistant'
  content TEXT NOT NULL,
  intent VARCHAR(100),  -- Detected intent (if any)
  extracted_data JSONB,  -- Extracted entities/data
  created_at TIMESTAMP DEFAULT NOW()
);

-- Business API configurations (encrypted)
CREATE TABLE business_api_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id),
  api_name VARCHAR(100) NOT NULL,
  base_url TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  authentication_type VARCHAR(50) NOT NULL,
  headers JSONB,
  timeout INTEGER DEFAULT 10000,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics (conversation logs)
CREATE TABLE conversation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id),
  session_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,  -- Business's customer ID
  intent VARCHAR(100),
  module_executed VARCHAR(100),
  execution_time_ms INTEGER,
  success BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking (for billing)
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id),
  date DATE NOT NULL,
  conversation_count INTEGER DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,
  total_execution_time_ms BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, date)
);
```


***

## 🚀 Deployment Guide

### **Environment Variables**

```bash
# .env.local
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase (PostgreSQL)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API Key Encryption (for encrypting API keys before storing in database)
API_ENCRYPTION_KEY=your_32_byte_hex_key_for_encryption

# Optional: Fallback API keys (only used if workflow doesn't have its own key)
# These are NOT required - API keys should be configured per workflow in the UI
PERPLEXITY_API_KEY=pplx-...  # Optional fallback
GOOGLE_GENERATIVE_AI_API_KEY=AIza...  # Optional fallback

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Vercel (auto-set in production)
VERCEL_URL=
```

**Important Notes:**

1. **API Keys Per Workflow**: API keys for GenAI providers (Perplexity, Google Gemini) are stored per workflow in the database, not in environment variables. Users configure them through the UI.
2. **Encryption Key**: The `API_ENCRYPTION_KEY` is used to encrypt API keys before storing them in the database. This must be a 32-byte key (64 hex characters).
3. **Fallback Keys**: Optional environment variables (`PERPLEXITY_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`) can be used as fallbacks, but the primary method is to configure keys per workflow in the UI.
4. **Supabase**: Uses Supabase for database, authentication (via Clerk), and storage.
5. **Clerk**: Handles user authentication and session management.


### **Deployment Steps**

```bash
# 1. Install dependencies
npm install

# 2. Run database migrations
npx prisma migrate deploy

# 3. Build application
npm run build

# 4. Deploy to Vercel
vercel --prod

# 5. Set environment variables in Vercel dashboard
# Settings → Environment Variables → Add all from .env.local
```


### **CI/CD Pipeline (GitHub Actions)**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run tests
        run: npm test
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```


***
## ✅ Summary

**Blitz Protocol** solves the e-commerce customer support automation problem by combining:

1. **Natural Language Understanding** (GenAI) - Users talk naturally
2. **Visual Workflow Control** (React Flow) - Businesses customize logic
3. **Secure API Orchestration** - Safe integration with business systems

**Tech Stack:**

- Next.js + Vercel (frontend \& API)
- PostgreSQL/Supabase (persistent data, chat history, workflow configurations)
- Perplexity AI (Sonar Pro) and Google Gemini (intent detection)
- React Flow (workflow builder)
- Clerk (authentication)
- AES-256-CBC encryption (for API key storage)

**Key Differentiator:** Separation of conversation from execution - businesses get AI benefits without losing control.

**Target Market:** E-commerce businesses spending \$5K-50K/month on customer support, looking to automate 70%+ of repetitive queries while maintaining quality.

---

## 📝 Recent Updates (Latest Changes)

### **GenAI Configuration Enhancements**

1. **Multi-Provider Support**
   - Added support for Google Gemini models (`gemini-pro`, `gemini-1.5-pro`, `gemini-1.5-flash`)
   - Maintained support for Perplexity AI (`sonar-pro`)
   - Users can select their preferred AI provider in the GenAI node configuration panel

2. **Simplified Configuration UI**
   - Removed Temperature field from UI (now hardcoded to 0.2 for consistent intent detection)
   - Removed System Prompt textbox (uses optimized default prompt for intent classification)
   - Streamlined configuration process for better UX

3. **Workflow-Specific API Keys**
   - API keys are now stored per workflow in the database (encrypted)
   - Each workflow can have its own AI provider and API key configuration
   - API keys are loaded from database and decrypted on-demand (not from environment variables)
   - Supports multiple workflows with different AI providers

4. **Secure API Key Storage**
   - API keys are encrypted using AES-256-CBC before storing in database
   - Uses scrypt key derivation for enhanced security
   - Encryption format: `salt:iv:encrypted` (all in hex)

5. **API Key Validation & Testing**
   - **Real-time API Key Validation**: API keys are tested with actual API calls before saving
   - **Automatic Validation on Save**: When saving a GenAI node configuration, the API key is automatically tested
   - **Invalid Key Handling**: If an API key is invalid, the configuration is saved but marked as "not configured"
   - **Test Endpoint**: Test endpoint (`/api/nodes/test-genai`) loads configuration from database and tests with real API calls
   - **Automatic Re-validation**: API keys are re-validated when loading workflows to ensure they still work
   - **Error Messages**: Clear error messages when API keys are invalid or unauthorized

6. **View/Edit Mode for GenAI Configuration**
   - **View Mode**: When a GenAI node is configured, shows masked API key (`****`) and read-only model selection
   - **Edit Mode**: Allows updating API key and model selection with validation
   - **Test Configuration Button**: Available in view mode to test the configured API key
   - **Edit Config Button**: Replaces "Save configuration" button in view mode
   - **Cancel Functionality**: Allows canceling edits and reverting to saved configuration
   - **Improved UX**: Cleaner interface with clear separation between viewing and editing

7. **Chat History Persistence**
   - Chat sessions and messages are stored in Supabase (`chat_sessions` and `chat_messages` tables)
   - Conversation history is loaded and used for context in intent detection
   - Supports multiple chat sessions per user/business
   - **Fixed Message Duplication**: Conversation history is retrieved before saving new messages to avoid duplication
   - **Message Alternation**: Proper message alternation validation to ensure AI SDK compatibility

8. **Automatic Workflow Creation**
   - Workflows are automatically created when a user first accesses the workflows page
   - Default workflow includes GenAI, Router, and Response nodes
   - Ensures every business has a workflow to configure

9. **Node Configuration Management**
   - Node configurations are stored separately in `node_configurations` table
   - Supports configuration for GenAI, Router, Module, and Response nodes
   - Configurations are loaded and merged with workflow state when needed
   - API keys are automatically encrypted/decrypted during save/load operations
   - **Configuration Validation**: Configurations are validated before saving, including API key testing

10. **Improved Chat API Flow**
    - **Message Handling**: Proper message alternation between user and assistant messages
    - **Conversation Context**: Conversation history is properly formatted and validated before sending to AI
    - **Error Handling**: Improved error messages for configuration issues and API failures
    - **Status Indicators**: Chat UI shows workflow readiness status based on GenAI node configuration
    - **Business Workflow Selection**: Users can select which business workflow to use for chat
    - **Test API Endpoint**: GET endpoint to test if a business workflow has a configured and working GenAI node

11. **Workflow Validation Improvements**
    - **API Key Testing**: Workflows are validated to ensure GenAI node API keys are working
    - **Automatic Status Updates**: Invalid API keys automatically mark nodes as "not configured"
    - **Business Status API**: `/api/businesses` endpoint tests API keys to determine if workflows are ready
    - **Chat UI Status**: Chat interface shows accurate status of workflow configuration

12. **Refactored Node Configuration Logic**
    - **Separate Configuration Files**: Each node type has its own configuration file (e.g., `genai-node.config.ts`)
    - **Centralized Validation**: Node configuration validation is centralized in configuration files
    - **Reusable Components**: Configuration logic can be easily reused across different parts of the application
    - **Type Safety**: Improved TypeScript types for node configurations

### **Database Schema Updates**

- Added `node_configurations` table for storing node-specific configurations
  - Stores encrypted API keys for GenAI nodes
  - Tracks configuration status (`is_configured` flag)
  - Supports different node types (GenAI, Router, Module, Response)
- Added `chat_sessions` and `chat_messages` tables for conversation history
  - `chat_sessions`: Stores chat session metadata (user, business, timestamps)
  - `chat_messages`: Stores individual messages with role, content, intent, and metadata
  - Messages are ordered by `created_at` for proper conversation context
- Updated `workflows` table to enforce single workflow per business
- Added encryption/decryption utilities for secure API key storage

### **API Route Updates**

- **`/api/nodes/test-genai` (POST)**
  - Loads configuration from database (with decrypted API key)
  - Tests API key with actual API call to AI provider
  - Supports testing with new API keys (for edit mode)
  - Returns detailed test results including intent detection
  - Validates configuration before testing

- **`/api/workflows/node-config` (POST)**
  - **For GenAI nodes**: `isConfigured` is ALWAYS determined by API key validation test
  - Frontend's `isConfigured` value is ignored for GenAI nodes
  - Tests API key before saving configuration
  - **Valid API key** → Sets `is_configured = true` in database
  - **Invalid API key** → Sets `is_configured = false` in database
  - Saves configuration even if API key is invalid (for user to edit)
  - Returns error response if API key is invalid (but still saves config)
  - Supports GenAI and Gemini models with proper validation
  - Comprehensive logging to track save process and verify database updates

- **`/api/chat` (POST)**
  - Loads workflow and GenAI node configuration from database
  - Validates API key is working before processing messages
  - Retrieves conversation history before saving new messages
  - Properly formats messages for AI SDK (alternating user/assistant)
  - Handles message alternation validation and fixing
  - Saves user message and assistant response to database
  - Returns structured response with intent, method, and data

- **`/api/chat` (GET)**
  - Tests if business workflow has configured GenAI node
  - Validates API key is working before returning success
  - Returns error if GenAI node is not configured or API key is invalid
  - Used by "Test API" button in chat UI

- **`/api/businesses` (GET)**
  - Lists all businesses with workflow status
  - Tests API keys to determine if workflows are ready
  - Automatically marks nodes as "not configured" if API keys are invalid
  - Returns accurate `hasGenAINode` status based on API key validation

### **UI/UX Improvements**

- **GenAI Node Configuration Panel**
  - View/Edit mode toggle for better UX
  - Masked API key display (`****`) in view mode
  - Read-only model selection in view mode
  - "Test Configuration" button in view mode
  - "Edit Config" button to enter edit mode
  - "Save configuration" and "Cancel" buttons in edit mode
  - Real-time validation feedback
  - Clear error messages for invalid API keys
  - Support for both Perplexity and Google Gemini models

- **Chat Interface**
  - Business workflow selection dropdown
  - "Test API" button to test workflow configuration
  - Status indicators showing workflow readiness
  - Green banner when GenAI node is configured and working
  - Yellow warning when GenAI node is not configured
  - Disabled send button when workflow is not ready
  - Dynamic placeholder text based on configuration status
  - Intent badges in chat messages
  - Improved error messages with actionable guidance

- **Workflow Canvas**
  - Node handles positioned on left (input) and right (output) sides
  - "Add Module" button repositioned to top-right with padding
  - Core nodes (GenAI, Router, Response) are non-deletable
  - Router node has single output endpoint for all modules
  - Configuration panel opens on node click
  - Backdrop overlay when configuration panel is open
  - Real-time workflow status updates

- **Error Handling**
  - Clear, user-friendly error messages
  - Contextual error messages based on failure type
  - Actionable error messages with next steps
  - Error display in configuration panel (not just alerts)
  - Validation feedback before saving

### **Response Formatter Node - How It Works**

The Response Formatter node is the final step in the workflow that formats module outputs before sending them to the frontend. Here's how it works:

**Connection Flow:**
```
Module Node → Response Formatter → Router → Frontend
```

**Configuration Options:**

1. **Text Response** (`text`)
   - Simple text response sent directly to the user
   - Used for plain text messages
   - Example: "Your order has been cancelled successfully."

2. **Structured Data** (`structured`)
   - JSON data response with optional schema
   - Used for API-like responses
   - Example: `{ "status": "success", "orderId": "ORD-123", "message": "Order cancelled" }`

3. **UI Component** (`ui-component`)
   - Custom React component with props
   - Used for rich UI elements (cards, buttons, forms, etc.)
   - Example: `{ "component": "OrderDetailsCard", "props": { "orderId": "ORD-123" } }`

**How Modules Connect:**

- Modules execute and return data
- Module output connects to Response Formatter (via edge)
- Response Formatter formats data according to configured type
- Formatted response flows back through Router to frontend
- Frontend renders the response (text, JSON, or UI component)

**Example Workflow:**
1. User asks: "Where is my order?"
2. GenAI detects intent: `order_query`
3. Router routes to Order Tracking Module
4. Module fetches order data from business API
5. Module output connects to Response Formatter
6. Response Formatter formats as UI Component: `OrderDetailsCard`
7. Router sends formatted response to frontend
8. Frontend renders `OrderDetailsCard` with order details

---

## 🔄 Complete Chat Flow (Updated)

### **End-to-End Chat Flow**

1. **User sends message** → Frontend (`app/page.tsx`)
   - Validates business has configured GenAI node
   - Sends POST to `/api/chat` with message and businessId

2. **Chat API** (`app/api/chat/route.ts`)
   - Authenticates user
   - Loads workflow and GenAI node (validates API key works)
   - Gets chat history (before saving new message)
   - Saves user message to database
   - Creates GenAINodeExecutor with decrypted API key
   - Executes GenAI node

3. **GenAI Node Executor** (`app/lib/nodes/executors/GenAINodeExecutor.ts`)
   - Validates configuration (API key, model)
   - Prepares messages array (history + current message)
   - Validates message alternation (user/assistant)
   - Sets API key in environment (temporarily)
   - Calls AI API (Perplexity or Gemini)
   - Parses intent and extracted data
   - Returns result with method (GENAI_TO_FRONTEND or FRONTEND_TO_BLITZ)

4. **Response** → Chat API
   - Saves assistant response to database
   - Returns JSON response to frontend

5. **Frontend** → Displays response in chat UI
   - Shows response with intent badges
   - Updates chat messages list

### **Key Features**

- ✅ **API Key Validation**: API keys are tested before use
- ✅ **View/Edit Modes**: Clean UI for viewing and editing configurations
- ✅ **Message Alternation**: Proper message formatting for AI SDK
- ✅ **Conversation Context**: Previous messages included for better responses
- ✅ **Error Handling**: Clear error messages with actionable guidance
- ✅ **Status Indicators**: Real-time workflow readiness status
- ✅ **Multi-Business Support**: Each business uses its own workflow and API key

---

## 🔧 Latest Updates (December 2024)

### **API Key Management & Configuration Fixes**

1. **Fixed `/api/businesses` Endpoint**
   - Now properly checks `is_configured` flag directly from database (`node_configurations` table)
   - Uses `workflowHasConfiguredGenAI()` helper to query database for accurate status
   - Database `is_configured` column is the source of truth for configuration status
   - Decryption verification is performed for logging/debugging but doesn't affect the result
   - Improved logging to help debug configuration issues

2. **Enhanced API Key Decryption**
   - Improved error handling in `decryptConfigData()` function
   - Better validation of encrypted data format (salt:iv:encrypted)
   - Validates buffer lengths and hex strings before decryption
   - Preserves database `is_configured` flag even if decryption fails
   - Clear error messages when `API_ENCRYPTION_KEY` is missing or incorrect
   - Handles edge cases like empty or corrupted encrypted data

3. **Improved Configuration Loading**
   - `loadNodeConfigurations()` now preserves database `is_configured` flag even on decryption errors
   - Better error logging with detailed context (node ID, node type, error details)
   - Graceful handling of decryption failures without breaking workflow loading
   - Logs configuration status for debugging purposes

4. **Fixed GenAI Node Configuration Saving**
   - **Critical Fix**: `is_configured` is now ALWAYS determined by API key validation test
   - Frontend's `isConfigured` value is ignored for GenAI nodes
   - API key is tested before saving, and `is_configured` is set based on test result:
     - ✅ Valid API key → `is_configured = true` in database
     - ❌ Invalid API key → `is_configured = false` in database
   - Added comprehensive logging to track configuration save process
   - Verifies saved `is_configured` value matches expected value

5. **Added `validateConfig()` Method to GenAINodeExecutor**
   - Fixed "executor.validateConfig is not a function" error
   - Validates model is present and supported
   - Validates API key format (starts with "pplx-" or "AIza")
   - Returns `{ valid: boolean; errors: string[] }` format
   - Used by `api-key-validator.ts` for configuration validation

6. **Enhanced Database Operations**
   - `saveNodeConfiguration()` now includes detailed logging
   - Logs when updating vs creating new configurations
   - Verifies `is_configured` value is correctly saved
   - Better error messages for database operation failures

### **Technical Details**

**API Key Encryption/Decryption Flow:**
1. When saving: API key is encrypted using AES-256-CBC with scrypt key derivation
2. Format: `salt:iv:encrypted` (all in hex)
3. When loading: API key is decrypted using `API_ENCRYPTION_KEY` from environment
4. If decryption fails: Configuration is still loaded but without decrypted API key
5. Database `is_configured` flag is preserved regardless of decryption status

**Configuration Status Determination:**
- **Source of Truth**: `is_configured` column in `node_configurations` table
- **For GenAI Nodes**: Status is determined by API key validation test
- **For Other Nodes**: Status is determined by configuration completeness
- **Business API**: `/api/businesses` queries database directly for accurate status

**Error Handling Improvements:**
- Decryption errors are logged with full context
- Configuration loading continues even if some nodes fail to decrypt
- Clear error messages guide users to fix issues (e.g., check `API_ENCRYPTION_KEY`)
- Database operations include verification logging

### **Files Modified**

- `app/api/businesses/route.ts` - Fixed to check database `is_configured` flag
- `app/lib/db/node-configurations.ts` - Enhanced decryption and error handling
- `app/lib/encryption.ts` - Improved validation and error messages
- `app/api/workflows/node-config/route.ts` - Fixed to set `is_configured` based on API key test
- `app/lib/nodes/executors/GenAINodeExecutor.ts` - Added `validateConfig()` method
- `app/lib/nodes/utils/workflow-loader.ts` - Improved error handling and logging
- `app/api/chat/route.ts` - Updated comments and error handling

**This is your complete technical and business blueprint. Ready to build! 🚀**

