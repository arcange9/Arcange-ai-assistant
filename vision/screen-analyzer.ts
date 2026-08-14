export type VisionProvider = 'gemini' | 'openrouter';

export interface UIElement {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label: string;
  type?: 'button' | 'input' | 'text' | 'image' | 'link' | 'icon' | 'other';
  description?: string;
}

export interface ScreenAnalysisResult {
  rawText: string;
  summary: string;
  detectedElements: UIElement[];
  applicationState?: string;
  layoutDescription?: string;
}

export interface VisionOptions {
  geminiApiKey?: string;
  openRouterApiKey?: string;
  defaultProvider?: VisionProvider;
  defaultModel?: string;
}

export class ScreenAnalyzer {
  private geminiApiKey: string;
  private openRouterApiKey: string;
  private defaultProvider: VisionProvider;
  private defaultModel: string;

  constructor(options: VisionOptions = {}) {
    this.geminiApiKey =
      options.geminiApiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      '';
    this.openRouterApiKey =
      options.openRouterApiKey ||
      process.env.OPENROUTER_API_KEY ||
      '';
    this.defaultProvider = options.defaultProvider || 'gemini';
    this.defaultModel = options.defaultModel || 'gemini-1.5-flash';
  }

  /**
   * Cleans base64 image string by removing prefix if present
   */
  private cleanBase64(base64: string): { data: string; mimeType: string } {
    let mimeType = 'image/png';
    let data = base64;

    const match = base64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      data = match[2];
    }

    return { data, mimeType };
  }

  /**
   * Main vision API request router (Gemini vs OpenRouter)
   */
  public async analyzeScreenshot(
    imageBase64: string,
    instruction: string,
    provider: VisionProvider = this.defaultProvider,
    model?: string
  ): Promise<string> {
    const { data: cleanData, mimeType } = this.cleanBase64(imageBase64);

    if (provider === 'gemini') {
      return this.analyzeWithGemini(cleanData, mimeType, instruction, model || 'gemini-1.5-flash');
    } else {
      return this.analyzeWithOpenRouter(
        cleanData,
        mimeType,
        instruction,
        model || 'google/gemini-flash-1.5'
      );
    }
  }

  /**
   * Call Gemini REST API with inline base64 image data
   */
  private async analyzeWithGemini(
    cleanBase64: string,
    mimeType: string,
    instruction: string,
    model: string
  ): Promise<string> {
    if (!this.geminiApiKey) {
      throw new Error(
        'Gemini API key is not configured. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.'
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: instruction },
            {
              inline_data: {
                mime_type: mimeType,
                data: cleanBase64,
              },
            },
          ],
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini Vision API error (${response.status}): ${errorText}`);
    }

    const json: any = await response.json();
    const candidateText =
      json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return candidateText.trim();
  }

  /**
   * Call OpenRouter Chat Completions API with vision multimodal content
   */
  private async analyzeWithOpenRouter(
    cleanBase64: string,
    mimeType: string,
    instruction: string,
    model: string
  ): Promise<string> {
    if (!this.openRouterApiKey) {
      throw new Error(
        'OpenRouter API key is not configured. Set OPENROUTER_API_KEY environment variable.'
      );
    }

    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const imageUrl = `data:${mimeType};base64,${cleanBase64}`;

    const payload = {
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: instruction },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openRouterApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter Vision API error (${response.status}): ${errorText}`);
    }

    const json: any = await response.json();
    const content = json.choices?.[0]?.message?.content || '';
    return content.trim();
  }

  /**
   * Find a target UI element on screen and return its estimated coordinates
   */
  public async findElement(
    description: string,
    screenshotBase64: string,
    provider: VisionProvider = this.defaultProvider,
    model?: string
  ): Promise<UIElement | null> {
    const prompt = `You are a precision GUI vision parser. Analyze this screenshot and locate the following UI element: "${description}".
Return ONLY a raw valid JSON object with no markdown formatting or backticks:
{
  "x": number (center x coordinate in pixels or percentage 0-1000),
  "y": number (center y coordinate in pixels or percentage 0-1000),
  "width": number,
  "height": number,
  "confidence": number (between 0.0 and 1.0),
  "label": string,
  "type": "button" | "input" | "text" | "image" | "link" | "icon" | "other"
}
If the element cannot be found, return {"error": "Element not found"}.`;

    const resultText = await this.analyzeScreenshot(screenshotBase64, prompt, provider, model);

    try {
      const cleanedJson = resultText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const parsed = JSON.parse(cleanedJson);

      if (parsed.error || parsed.x === undefined) {
        return null;
      }

      return {
        x: Number(parsed.x),
        y: Number(parsed.y),
        width: Number(parsed.width || 0),
        height: Number(parsed.height || 0),
        confidence: Number(parsed.confidence || 0.9),
        label: String(parsed.label || description),
        type: parsed.type || 'other',
      };
    } catch {
      return null;
    }
  }

  /**
   * Extract all visible textual content from the screenshot
   */
  public async extractText(
    screenshotBase64: string,
    provider: VisionProvider = this.defaultProvider,
    model?: string
  ): Promise<string> {
    const prompt =
      'Transcribe and extract ALL visible text present in this screenshot in order from top-to-bottom, left-to-right. Do not summarize; extract the actual text.';
    return this.analyzeScreenshot(screenshotBase64, prompt, provider, model);
  }

  /**
   * Provide a natural language description of the current screen state
   */
  public async describeScreen(
    screenshotBase64: string,
    provider: VisionProvider = this.defaultProvider,
    model?: string
  ): Promise<string> {
    const prompt =
      'Describe this screen in natural language. Mention open applications, window layout, key controls/buttons, navigation menus, open tabs, and current application state.';
    return this.analyzeScreenshot(screenshotBase64, prompt, provider, model);
  }
}

export default ScreenAnalyzer;
