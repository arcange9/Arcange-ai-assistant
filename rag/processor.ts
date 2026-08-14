import * as fs from 'fs/promises';
import * as path from 'path';

export interface ChunkMetadata {
  source: string;
  documentId: string;
  pageNumber?: number;
  sectionHeader?: string;
  chunkIndex: number;
  totalChunks: number;
}

export interface DocumentChunk {
  id: string;
  text: string;
  metadata: ChunkMetadata;
  index: number;
}

export interface DocumentInfo {
  id: string;
  name: string;
  type: string;
  pages: number;
  size: number;
  path: string;
  createdAt: string;
}

export interface ProcessedDocument {
  chunks: DocumentChunk[];
  documentInfo: DocumentInfo;
}

export interface ChunkingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export class DocumentProcessor {
  private defaultChunkSize: number;
  private defaultChunkOverlap: number;

  constructor(options: ChunkingOptions = {}) {
    this.defaultChunkSize = options.chunkSize || 1000;
    this.defaultChunkOverlap = options.chunkOverlap || 200;
  }

  /**
   * Process document file into chunks and metadata
   */
  public async processDocument(
    filePath: string,
    options?: ChunkingOptions
  ): Promise<ProcessedDocument> {
    const absolutePath = path.resolve(filePath);
    const stats = await fs.stat(absolutePath);
    const fileName = path.basename(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let textContent = '';
    let pageCount = 1;

    switch (ext) {
      case '.pdf': {
        const pdfData = await this.parsePdf(absolutePath);
        textContent = pdfData.text;
        pageCount = pdfData.pages;
        break;
      }
      case '.docx':
      case '.doc': {
        textContent = await this.parseDocx(absolutePath);
        break;
      }
      case '.csv': {
        textContent = await this.parseCsv(absolutePath);
        break;
      }
      case '.md':
      case '.txt':
      case '.json':
      case '.log': {
        textContent = await fs.readFile(absolutePath, 'utf-8');
        break;
      }
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.webp': {
        textContent = await this.parseImageOcr(absolutePath);
        break;
      }
      default: {
        // Default text attempt
        try {
          textContent = await fs.readFile(absolutePath, 'utf-8');
        } catch {
          throw new Error(`Unsupported document extension "${ext}" for file: ${fileName}`);
        }
      }
    }

    const documentInfo: DocumentInfo = {
      id: docId,
      name: fileName,
      type: ext.replace('.', '').toUpperCase(),
      pages: pageCount,
      size: stats.size,
      path: absolutePath,
      createdAt: new Date().toISOString(),
    };

    const chunkSize = options?.chunkSize || this.defaultChunkSize;
    const chunkOverlap = options?.chunkOverlap || this.defaultChunkOverlap;

    const chunks = this.createChunks(textContent, documentInfo, chunkSize, chunkOverlap);

    return {
      chunks,
      documentInfo,
    };
  }

  /**
   * Parse PDF using pdf-parse library with fallback
   */
  private async parsePdf(filePath: string): Promise<{ text: string; pages: number }> {
    const dataBuffer = await fs.readFile(filePath);
    try {
      const pdfParse = (await import('pdf-parse')).default || (await import('pdf-parse'));
      const parsed = await pdfParse(dataBuffer);
      return {
        text: parsed.text || '',
        pages: parsed.numpages || 1,
      };
    } catch (err) {
      // Fallback pdf plain text extraction
      const text = dataBuffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      return { text, pages: 1 };
    }
  }

  /**
   * Parse DOCX using mammoth library with fallback
   */
  private async parseDocx(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch {
      return buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    }
  }

  /**
   * Parse CSV into structured textual representation
   */
  private async parseCsv(filePath: string): Promise<string> {
    const rawContent = await fs.readFile(filePath, 'utf-8');
    try {
      const Papa = await import('papaparse');
      const parsed = Papa.parse(rawContent, { header: true, skipEmptyLines: true });
      if (parsed.data && parsed.data.length > 0) {
        return parsed.data
          .map((row: any, idx: number) => {
            const fields = Object.entries(row)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' | ');
            return `[Row ${idx + 1}] ${fields}`;
          })
          .join('\n');
      }
    } catch {
      // Fallback CSV parsing line by line
    }
    return rawContent;
  }

  /**
   * Parse Image text via base64 OCR / ScreenAnalyzer
   */
  private async parseImageOcr(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    const base64 = buffer.toString('base64');
    try {
      const { ScreenAnalyzer } = await import('../vision/screen-analyzer');
      const analyzer = new ScreenAnalyzer();
      return await analyzer.extractText(base64);
    } catch {
      return `Image file ${path.basename(filePath)} (OCR unavailable)`;
    }
  }

  /**
   * Split text content into overlapping chunks with section metadata detection
   */
  private createChunks(
    text: string,
    docInfo: DocumentInfo,
    chunkSize: number,
    chunkOverlap: number
  ): DocumentChunk[] {
    const rawLines = text.split(/\r?\n/);
    const chunks: DocumentChunk[] = [];

    let currentChunkText = '';
    let currentSectionHeader = 'Introduction';
    let chunkIndex = 0;

    const pushChunk = (chunkText: string) => {
      const trimmed = chunkText.trim();
      if (trimmed.length > 0) {
        chunks.push({
          id: `${docInfo.id}_chunk_${chunkIndex}`,
          text: trimmed,
          metadata: {
            source: docInfo.name,
            documentId: docInfo.id,
            sectionHeader: currentSectionHeader,
            chunkIndex,
            totalChunks: 0, // updated after full loop
          },
          index: chunkIndex,
        });
        chunkIndex++;
      }
    };

    for (const line of rawLines) {
      // Heading detection
      if (line.startsWith('#') || /^SECTION\s+\d+/i.test(line) || /^[A-Z0-9\s]{4,30}:$/.test(line)) {
        currentSectionHeader = line.replace(/^#+\s*/, '').trim();
      }

      if (currentChunkText.length + line.length + 1 > chunkSize) {
        pushChunk(currentChunkText);

        // Keep overlap from previous chunk end
        const overlapStart = Math.max(0, currentChunkText.length - chunkOverlap);
        currentChunkText = currentChunkText.substring(overlapStart) + '\n' + line;
      } else {
        currentChunkText += (currentChunkText ? '\n' : '') + line;
      }
    }

    if (currentChunkText.trim().length > 0) {
      pushChunk(currentChunkText);
    }

    // Set totalChunks metadata
    const totalChunks = chunks.length;
    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = totalChunks;
    });

    return chunks;
  }
}

export default DocumentProcessor;
