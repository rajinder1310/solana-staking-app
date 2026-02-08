# Solana Event Indexer - How It Works

## Automatic Event Detection (No Manual Scripts Needed!)

The indexer runs **continuously in the background** and automatically detects new transactions using **WebSocket subscriptions**.

### Current Status

Check if indexer is running:
```bash
ps aux | grep "npm run dev"
```

View live logs:
```bash
tail -f /home/user/Antigravity/StakingSolanaApp/Solana-Event-Indexer/indexer.log
```

### How It Works

1. **WebSocket Subscription** (`RealtimeIndexer`):
   - Subscribes to program logs: `connection.onLogs(programId, callback)`
   - Receives events **instantly** when transactions occur
   - No polling, no delays - real-time!

2. **Historical Backfill** (`HistoricalIndexer`):
   - Runs every 5 seconds to catch any missed transactions
   - Fetches from last indexed slot
   - Ensures no gaps in data

### What Happens When You Make a New Transaction

```
1. You call deposit/withdraw on Solana
2. Transaction is confirmed on-chain
3. Solana emits log with "Program data: ..."
4. WebSocket receives the log (< 1 second)
5. Indexer parses the event
6. Event is saved to MongoDB
7. You can query it immediately!
```

### No Scripts Needed!

❌ **You DON'T need to run:**
- `extract_new_deposit.js` (only used once for the schema fix)
- `DIRECT_FIX.js` (only for initial backfill)
- Any manual scripts

✅ **Indexer runs automatically:**
- Started with: `npm run dev`
- Runs in background
- Detects all new transactions
- Saves events to database

### To Start/Stop Indexer

**Start:**
```bash
cd /home/user/Antigravity/StakingSolanaApp/Solana-Event-Indexer
npm run dev > indexer.log 2>&1 &
```

**Stop:**
```bash
pkill -f "npm run dev"
```

**Check Status:**
```bash
tail -f indexer.log
```

### Test It Yourself

1. Make a new deposit/withdraw transaction
2. Wait 1-2 seconds
3. Check database:
   ```bash
   node check_new_event.js
   ```
4. You'll see the new event automatically!

---

**Current Status:** ✅ Indexer is running and monitoring for new transactions
