# Solana Event Indexer

A robust and scalable TypeScript service designed to index and process transactions from Solana programs in real-time. It uses **@solana/web3.js** for blockchain interaction and **MongoDB** for data persistence.

## 🚀 Features

*   **Dual Indexing Strategy**:
    *   **Historical Indexing**: Uses a continuous polling loop to fetch past transaction signatures using `getSignaturesForAddress`.
    *   **Realtime Indexing**: Establishes a WebSocket connection to the Solana RPC node (`onLogs`) to listen for new events instantly.
*   **Auto-Resume**: Automatically picks up from the last indexed slot after a restart, ensuring no data is lost.
*   **Commitment Level**: Uses `confirmed` commitment to avoid data inconsistencies.
*   **Adaptive Batching**: Dynamically adjusts batch sizes based on network performance.
*   **Duplicate Prevention**: Handles duplicate transactions gracefully using compound unique indexes.

## 🛠 Prerequisites

Before running this project, ensure you have the following installed:

*   **Node.js** (v18 or higher recommended)
*   **MongoDB** (Local instance or Atlas cluster)

## 📦 Installation
 
1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd Solana-Event-Indexer
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Copy the example environment file and configure it:
    ```bash
    cp .env.example .env
    ```
    Open `.env` and configure your MongoDB URI and Solana RPC endpoints.

    **For Devnet (Public/Free):**
    ```env
    MONGO_URI=mongodb://localhost:27017/solana_indexer
    RPC_URL=https://api.devnet.solana.com
    WS_URL=wss://api.devnet.solana.com
    ```

    **For Mainnet (Recommended):**
    Use a dedicated RPC provider like Helius, QuickNode, or Alchemy to avoid rate limits.

## ⚙️ Configuration

The service is configured via `src/config/programs.ts`. You can add or modify program configurations in the `programs` array.

**Example Program Config:**
```typescript
{
  id: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Target Program ID
  name: 'user-contract',
  startSlot: 0
}
```

## ▶️ Usage

### Development Mode
Run the service with hot-reloading:
```bash
npm run dev
```

### Production Build
Build the TypeScript code and run the compiled JavaScript:
```bash
npm run build
npm start
```

## 📂 Project Structure

*   `src/app.ts`: Entry point. Connects to DB and starts the indexer services.
*   `src/core/indexer/`:
    *   `historical.ts`: Handles backfilling past data using a polling loop.
    *   `realtime.ts`: Handles listening to new events via WebSocket.
*   `src/core/parsers/`: Logic to parse raw transaction data into usage formats.
*   `src/db/`: Database connection and Mongoose repositories.

## 📊 Database Schema

### Transaction Collection
Each transaction is stored with the following fields:

- `programId`: Solana program address involved in the transaction
- `signature`: Unique transaction signature
- `slot`: Slot number when transaction was processed
- `blockTime`: Unix timestamp of block
- `instructions`: Array of parsed instructions
- `logs`: Transaction logs
- `createdAt`: Timestamp when record was created

**Indexes:**
- Compound unique index on `(programId, signature)` - prevents duplicates.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the ISC License.
