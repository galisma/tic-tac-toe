use crate::protocol::{ClientMessage, ServerMessage};
use anyhow::Result;
use futures::{SinkExt, StreamExt};
use tokio::sync::mpsc;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;


use tokio::net::TcpStream;
use tokio_tungstenite::{WebSocketStream, MaybeTlsStream};

pub async fn connect(
    url: String,
    mut rx: mpsc::Receiver<ClientMessage>,
    tx: mpsc::Sender<ServerMessage>,
) -> Result<()> {
    // connect_async can take String directly or &str
    let (ws_stream, _) = connect_async(&url).await?;
    let ws_stream: WebSocketStream<MaybeTlsStream<TcpStream>> = ws_stream;
    let (mut write, mut read) = ws_stream.split();

    loop {
        tokio::select! {
            Some(msg) = rx.recv() => {
                let json = serde_json::to_string(&msg)?;
                write.send(Message::Text(json.into())).await?;
            }
            Some(msg) = read.next() => {
                match msg {
                    Ok(Message::Text(text)) => {
                        let text_str = text.to_string(); 
                        if let Ok(server_msg) = serde_json::from_str::<ServerMessage>(&text_str) {
                            if tx.send(server_msg).await.is_err() {
                                break;
                            }
                        }
                    }
                    Ok(Message::Close(_)) => break,
                    Err(e) => return Err(e.into()),
                    _ => {}
                }
            }
            else => break,
        }
    }
    Ok(())
}
