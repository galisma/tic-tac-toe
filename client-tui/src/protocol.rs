use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    #[serde(rename = "search")]
    Search,
    #[serde(rename = "leave")]
    Leave,
    #[serde(rename = "rematch")]
    Rematch { vote: bool },
    #[serde(rename = "move")]
    Move {
        square: usize,
    },
    #[serde(rename = "message")]
    Message {
        text: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ServerMessage {
    #[serde(rename = "match")]
    Match {
        symbol: String,
    },
    #[serde(rename = "move")]
    Move {
        square: usize,
    },
    #[serde(rename = "end")]
    End {
        result: String, // "win", "draw" (assumed), "disconnect"?
        winner: Option<String>,
    },
    #[serde(rename = "rematch_update")]
    RematchUpdate {
        #[serde(rename = "otherPlayerVoted")]
        other_player_voted: bool,
    },
    #[serde(rename = "error")]
    Error {
        message: String,
    },
}
