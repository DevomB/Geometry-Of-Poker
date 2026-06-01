declare module "parquetjs" {
  export class ParquetSchema {
    constructor(fields: Record<string, { type: string; optional?: boolean }>);
    fields: Record<string, unknown>;
  }

  export class ParquetWriter {
    static openFile(
      schema: ParquetSchema,
      path: string,
      opts?: unknown,
    ): Promise<ParquetWriter>;
    appendRow(row: Record<string, unknown>): Promise<void>;
    close(): Promise<void>;
  }

  export class ParquetReader {
    static openFile(path: string): Promise<ParquetReader>;
    getCursor(): { next(): Promise<Record<string, unknown> | null> };
    getSchema(): ParquetSchema;
    close(): Promise<void>;
  }
}
