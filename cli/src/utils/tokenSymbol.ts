import { PublicKey } from "@solana/web3.js";


const METAPLEX_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export async function getTokenSymbol(connection: any, mint: PublicKey): Promise<string> {
    try {
        const [metadataPDA] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("metadata"),
                METAPLEX_PROGRAM_ID.toBuffer(),
                mint.toBuffer(),
            ],
            METAPLEX_PROGRAM_ID
        );
        const accountInfo = await connection.getAccountInfo(metadataPDA);
        if (!accountInfo) return "TOKEN";
        const buffer = accountInfo.data;
        let offset = 65; 
        const nameLength = buffer.readUInt32LE(offset);
        offset += 4 + nameLength;
        const symbolLength = buffer.readUInt32LE(offset);
        offset += 4;
        const symbolBuffer = buffer.subarray(offset, offset + symbolLength);
        const symbol = symbolBuffer.toString("utf8").replace(/\0/g, "").trim();
        
        return symbol || "TOKEN";

    } catch (e) {
        return "TOKEN";
    }
}