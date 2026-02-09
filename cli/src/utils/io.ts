import * as fs from "fs";
import * as path from "path";

export interface UnsignedTxJson {
    description: string;
    network: string;
    messageBase64: string;
    meta?: {
        tokenSymbol?: string;
        decimals?: number;
        amount?: number;
    };
}

export const saveJson = (filename: string, data: any) => {
    const filePath = path.resolve(filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`\n📄 Saved to: ${filePath}`);
};

export const loadJson = <T>(filename: string): T => {
    if (!fs.existsSync(filename)) {
        throw new Error(`File not found: ${filename}`);
    }
    return JSON.parse(fs.readFileSync(filename, "utf-8"));
};