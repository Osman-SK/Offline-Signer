import { Connection } from "@solana/web3.js";

export const getConnection = (env: string): Connection => {
    let endpoint = env;
    
    if (env === 'devnet') {
        endpoint = "https://api.devnet.solana.com"; 
    } else if (env === 'mainnet') {
        endpoint = "https://api.mainnet-beta.solana.com"; 
    }

    return new Connection(endpoint, "confirmed");
};