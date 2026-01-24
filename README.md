# Tic tac toe on websocket

This is the API at the moment

## Client

### Search match

```json
{"type":"search"}
```

### Send movement
```json
{"type":"movement","square": 3} // 0 - 8
```

## Server

### Match found

```json
{"type":"match", "symbol":"X"} // "X" "O"
```
### Match ended
```json
{"type":"end", "result":"win"} // "win" "lose" "tie"