# Tic tac toe on websocket

Client implementation for the web.

## Client

### Search match

```json
{"type":"search"}
```

### Send movement
```json
{"type":"movement","square": 3}
```

## Server

### Match found

```json
{"type":"match", "symbol":"X"}
```