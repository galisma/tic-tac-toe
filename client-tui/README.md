# Tic-Tac-Toe over WebSockets
## Rust TUI client. ⚠️⚠️ FULLY AI GENERATED AS AN EXPERIMENT ⚠️⚠️. Needs to be checked. It's not 100% working neither complaiant with the API

The API is unstable and may change at any time.

## Client Messages

### Search Match
Enter the matchmaking queue.
```json
{"type":"search"}
```

### Leave Room
Leave the current room.
```json
{"type":"leave"}
```

### Rematch Vote
Vote to restart the game. The game restarts when both players vote `true`. Send `false` to cancel.
```json
{"type": "rematch", "vote": true}
```

### Send Move
Submit your move.
```json
{"type":"move", "square": 3} // 0 - 8
```

### Send Message
Send a message to the other player.
```json
{"type":"message","text":"hello world"}
```

## Server Messages

### Match Found
Sent when the game is ready to start.
```json
{"type":"match", "symbol":"X"} // "X" or "O"
```

### Match Ended
Sent when the match concludes.
```json
{"type":"end", "result":"win", "winner": "X"}
```

### Rematch Update
Sent when the opponent changes their vote status.
```json
{"type": "rematch_update", "otherPlayerVoted": true}
```

### Error
Sent when an action fails (e.g. invalid move or opponent disconnected).
```json
{"type": "error", "message": "Not your turn"}
```
