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
  - Upstash Redis for short-term conversation/session state
  - Supabase PostgreSQL for workflow definitions, user/business data

- **Automation Modules**
  - Each module: an isolated function integrating business APIs (track shipment, trigger refund, cancel order, etc.)
  - Module registry and configuration stored in database, invoked by orchestrator

- **GenAI Layer**
  - Powered by OpenAI (GPT-4 or Claude via Vercel AI SDK)
  - Handles natural language understanding, intent detection, and user-friendly responses

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
- **OpenAI/Anthropic API** (LLM layer)
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
// Call OpenAI with conversation context
const intentResponse = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    {
      role: 'system',
      content: `You are an intent classifier for an e-commerce chatbot.
      
      Available intents:
      - TRACK_SHIPMENT: User wants delivery status
      - CANCEL_ORDER: User wants to cancel
      - REQUEST_REFUND: User wants money back
      - MODIFY_ORDER: User wants to change order
      - GENERIC_QUERY: Everything else
      
      Previous conversation:
      ${JSON.stringify(context.messages)}
      
      Extract intent and entities as JSON:
      {
        "intent": "TRACK_SHIPMENT",
        "confidence": 0.95,
        "entities": {
          "product": "phone case",
          "action": "track"
        }
      }`
    },
    {
      role: 'user',
      content: "Where is my phone case?"
    }
  ],
  response_format: { type: 'json_object' }
});

// GenAI returns:
{
  "intent": "TRACK_SHIPMENT",
  "confidence": 0.95,
  "entities": {
    "product": "phone case"
  }
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


#### **Step 10: GenAI Formats Final Response**

```typescript
// Now we use GenAI to create friendly message
const finalResponse = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    {
      role: 'system',
      content: `You are a helpful customer support assistant.
      Format tracking information in a friendly, conversational way.
      Include key details: status, location, ETA, tracking link.
      Use emojis appropriately.`
    },
    {
      role: 'user',
      content: `Format this tracking data: ${JSON.stringify(trackingData)}`
    }
  ]
});

// GenAI returns:
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
import { openai } from './openai-client';
import { SessionContext, Intent } from '@blitz/types';

export async function detectIntent(
  userMessage: string,
  context: SessionContext
): Promise<Intent> {
  // Build conversation history for context
  const conversationHistory = context.messages
    .slice(-5)  // Last 5 messages only
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }));

  const systemPrompt = `You are an intent classifier for an e-commerce chatbot.

Available intents:
- TRACK_SHIPMENT: User wants delivery status/tracking
- CANCEL_ORDER: User wants to cancel an order
- REQUEST_REFUND: User wants refund/return
- MODIFY_ORDER: User wants to change address/items
- GENERIC_QUERY: General questions, greetings, etc.

Previous conversation:
${JSON.stringify(conversationHistory)}

Extract entities mentioned:
- orderId: Order number if mentioned
- product: Product name if mentioned
- reason: Reason for action if mentioned

Return JSON:
{
  "intent": "INTENT_NAME",
  "confidence": 0.0-1.0,
  "entities": {
    "key": "value"
  },
  "requiresFollowUp": boolean,
  "followUpQuestion": "string or null"
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3  // Low temperature for consistent classification
  });

  const intentData = JSON.parse(response.choices[0].message.content);
  
  return {
    type: intentData.intent,
    confidence: intentData.confidence,
    entities: intentData.entities || {},
    requiresFollowUp: intentData.requiresFollowUp || false,
    followUpQuestion: intentData.followUpQuestion || null,
    detectedAt: Date.now()
  };
}
```


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
import { streamText } from 'ai';
import { openai } from '@/lib/ai/openai-client';
import { detectIntent } from '@/lib/ai/intent-detector';
import { getSession, createSession, addMessage, updateSession } from '@/lib/redis/session';
import { executeModule } from '@/lib/modules';

export async function POST(req: Request) {
  try {
    const { userId, message, sessionId } = await req.json();

    // Get or create session
    let session = await getSession(sessionId);
    if (!session) {
      session = await createSession(sessionId, userId);
    }

    // Add user message to context
    await addMessage(sessionId, {
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    // Detect intent using GenAI
    const intent = await detectIntent(message, session);

    // Update session with detected intent
    await updateSession(sessionId, {
      currentIntent: intent,
      extractedEntities: {
        ...session.extractedEntities,
        ...intent.entities
      }
    });

    // If GenAI needs to ask follow-up, stream that response
    if (intent.requiresFollowUp && intent.followUpQuestion) {
      const result = await streamText({
        model: openai('gpt-4'),
        prompt: intent.followUpQuestion
      });

      return result.toAIStreamResponse();
    }

    // Execute appropriate module based on intent
    const moduleResult = await executeModule(intent.type, {
      userId,
      intent,
      session
    });

    // Handle module result based on flow type
    if (moduleResult.flow === 'MODULE_TO_FRONTEND') {
      // Return structured data directly to frontend
      return Response.json({
        type: 'structured_data',
        component: moduleResult.uiComponent,
        data: moduleResult.data
      });
    }

    // Flow is GENAI_TO_USER - format response with AI
    const result = await streamText({
      model: openai('gpt-4'),
      messages: [
        {
          role: 'system',
          content: `You are a helpful customer support assistant.
          Format the following module result in a friendly, conversational way.
          Use appropriate emojis and maintain a warm tone.`
        },
        {
          role: 'user',
          content: `Format this data: ${JSON.stringify(moduleResult.data)}`
        }
      ]
    });

    return result.toAIStreamResponse();

  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
```


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

### **Workflow Canvas Component**

```typescript
// components/workflow/WorkflowCanvas.tsx
'use client';

import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection
} from 'reactflow';
import 'reactflow/dist/style.css';

import { ModulePalette } from './ModulePalette';
import { CustomNodes } from './CustomNodes';

export function WorkflowCanvas({ workflowId }: { workflowId: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Custom node types
  const nodeTypes = {
    start: CustomNodes.StartNode,
    module: CustomNodes.ModuleNode,
    decision: CustomNodes.DecisionNode,
    api: CustomNodes.APINode,
    response: CustomNodes.ResponseNode,
    end: CustomNodes.EndNode,
  };

  const onConnect = (connection: Connection) => {
    setEdges((eds) => addEdge(connection, eds));
  };

  const onSave = async () => {
    // Save workflow definition to database
    await fetch(`/api/workflows/${workflowId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodes,
        edges,
        updatedAt: new Date().toISOString()
      })
    });
  };

  return (
    <div className="flex h-screen">
      {/* Module Palette - drag and drop modules */}
      <ModulePalette />

      {/* Main canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>

        {/* Action buttons */}
        <div className="absolute top-4 right-4 space-x-2">
          <button onClick={onSave} className="btn btn--primary">
            Save Workflow
          </button>
          <button className="btn btn--secondary">
            Test Workflow
          </button>
        </div>
      </div>
    </div>
  );
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

```typescript
// Database schema for API configurations
CREATE TABLE business_api_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id),
  api_name VARCHAR(100) NOT NULL,
  base_url TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,  -- Encrypted using AES-256
  authentication_type VARCHAR(50) NOT NULL,  -- 'bearer', 'apikey', 'oauth'
  headers JSONB,  -- Additional headers
  timeout INTEGER DEFAULT 10000,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

// Encryption helper
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32-byte key
const ALGORITHM = 'aes-256-cbc';

export function encryptAPIKey(apiKey: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return iv:encrypted format
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decryptAPIKey(encrypted: string): string {
  const [ivHex, encryptedData] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```


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

-- Module configurations
CREATE TABLE module_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id),
  module_type VARCHAR(100) NOT NULL,  -- TRACK_SHIPMENT, CANCEL_ORDER, etc.
  config JSONB NOT NULL,  -- Module-specific settings
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
# OpenAI
OPENAI_API_KEY=sk-...

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# PostgreSQL (Supabase)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...  # For migrations

# Encryption
ENCRYPTION_KEY=your_32_byte_hex_key

# App
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000

# Vercel (auto-set in production)
VERCEL_URL=
```


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
- Redis/Upstash (session storage)
- PostgreSQL/Supabase (persistent data)
- OpenAI GPT-4 (intent detection)
- React Flow (workflow builder)

**Key Differentiator:** Separation of conversation from execution - businesses get AI benefits without losing control.

**Target Market:** E-commerce businesses spending \$5K-50K/month on customer support, looking to automate 70%+ of repetitive queries while maintaining quality.

**This is your complete technical and business blueprint. Ready to build! 🚀**

