# Tic tac toe on websocket

This is the API at the moment

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