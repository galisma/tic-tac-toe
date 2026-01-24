# Tic-Tac-Toe over WebSockets

The API is unstable and may change at any time.

## Client

### Search match
Enter the match queue
```json
{"type":"search"}
```
### Leave room
Leave the current room
```json
{"type":"leave"}
```
### Rematch
Ask the opponent to play another game
```json
{"type": "rematch"}
```
### Rematch Response
Sent after receiving a `rematch` offer
```json
{"type":"response","accept":"true"} // true - false
```
### Send Move
Submit your move (unbelievable, right?)
```json
{"type":"movement","square":3} // 0 - 8
```
### Send Message
Send a beautiful message to the other player (currently unmoderated)
```json
{"type":"message","text":"hello world"}
```

## Server

### Match Found
Sent when the game is ready to start
```json
{"type":"match", "symbol":"X"} // "X" "O"
```
### Match Ended
Sent when a result is determined
```json
{"type":"end", "result":"win"} // "win" "lose" "tie"