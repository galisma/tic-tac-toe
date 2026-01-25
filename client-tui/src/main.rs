use anyhow::Result;
use crossterm::event::{self, Event, KeyCode, KeyEventKind};
use ratatui::prelude::*;
use std::time::Duration;
use tokio::sync::mpsc;

mod app;
mod network;
mod protocol;
mod tui;
mod ui;

use app::{App, CurrentScreen};
use protocol::{ClientMessage, ServerMessage};

#[tokio::main]
async fn main() -> Result<()> {
    let mut app = App::new();
    let mut terminal = tui::init()?;

    let (tx_server, mut rx_server) = mpsc::channel::<ServerMessage>(100);
    let (tx_client, rx_client) = mpsc::channel::<ClientMessage>(100);

    let url = std::env::args().nth(1).unwrap_or_else(|| "ws://localhost:8080".to_string());
    
    tokio::spawn(async move {
        if let Err(_e) = network::connect(url, rx_client, tx_server).await {
            // In a real app we might handle this better
        }
    });

    let res = run_app(&mut terminal, &mut app, tx_client, &mut rx_server).await;

    tui::restore()?;

    if let Err(e) = res {
        eprintln!("Error: {}", e);
    }
    
    Ok(())
}

async fn run_app<B: Backend>(
    terminal: &mut Terminal<B>,
    app: &mut App,
    tx_client: mpsc::Sender<ClientMessage>,
    rx_server: &mut mpsc::Receiver<ServerMessage>,
) -> Result<()>
where
    B::Error: Send + Sync + 'static,
{
    loop {
        terminal.draw(|f| ui::render(app, f))?;

        // 1. Handle Network Messages
        while let Ok(msg) = rx_server.try_recv() {
            handle_server_message(app, msg);
        }

        // 2. Handle Input (with timeout to allow redraw/network polling)
        if event::poll(Duration::from_millis(50))? {
            if let Event::Key(key) = event::read()? {
                if key.kind == KeyEventKind::Press {
                    if handle_input(app, key, &tx_client).await? {
                        return Ok(());
                    }
                }
            }
        }
        
        if !app.running {
            return Ok(());
        }
    }
}

async fn handle_input(app: &mut App, key: event::KeyEvent, tx: &mpsc::Sender<ClientMessage>) -> Result<bool> {
    if app.is_chatting {
        match key.code {
            KeyCode::Esc => {
                app.is_chatting = false;
            }
            KeyCode::Enter => {
                if !app.input_buffer.is_empty() {
                    let msg = app.input_buffer.clone();
                    app.messages.push(format!("You: {}", msg));
                    tx.send(ClientMessage::Message { text: msg }).await?;
                    app.input_buffer.clear();
                }
            }
            KeyCode::Backspace => {
                app.input_buffer.pop();
            }
            KeyCode::Char(c) => {
                app.input_buffer.push(c);
            }
            _ => {}
        }
        return Ok(false);
    }

    match app.current_screen {
        CurrentScreen::MainMenu => match key.code {
            KeyCode::Char('q') => return Ok(true),
            KeyCode::Char('s') => {
                tx.send(ClientMessage::Search).await?;
                app.current_screen = CurrentScreen::Searching;
            }
            _ => {}
        },
        CurrentScreen::Searching => match key.code {
            KeyCode::Char('q') => {
                tx.send(ClientMessage::Leave).await?; // Cancel search logic usually involves "leaving" the queue
                app.current_screen = CurrentScreen::MainMenu;
            }
            _ => {}
        },
        CurrentScreen::Game => match key.code {
            KeyCode::Char('q') => {
                tx.send(ClientMessage::Leave).await?;
                app.current_screen = CurrentScreen::MainMenu;
                app.board = Default::default();
                app.messages.clear();
            }
            KeyCode::Char('i') => {
                app.is_chatting = true;
            }
            KeyCode::Char('r') => {
                if app.winner.is_some() {
                    app.wants_rematch = !app.wants_rematch;
                    tx.send(ClientMessage::Rematch { vote: app.wants_rematch }).await?;
                    app.messages.push(format!("You voted rematch: {}", app.wants_rematch));
                }
            }
            KeyCode::Char(c) if c.is_digit(10) => {
                let digit = c.to_digit(10).unwrap() as usize;
                 if digit < 9 && app.board[digit].is_none() && app.winner.is_none() {
                     // Optimistic update? No, wait for confirmation or errors?
                     // Server doesn't echo move back to sender.
                     // Server code: `room.players[opponentIndex].send(...)`. Sender doesn't get it.
                     // So we MUST update locally.
                     
                     if let Some(my_sym) = &app.my_symbol {
                         app.board[digit] = Some(my_sym.clone());
                         tx.send(ClientMessage::Move { square: digit }).await?;
                     }
                 }
            }
            _ => {}
        },

    }
    
    Ok(false)
}

fn handle_server_message(app: &mut App, msg: ServerMessage) {
    match msg {
        ServerMessage::Match { symbol } => {
            app.current_screen = CurrentScreen::Game;
            app.my_symbol = Some(symbol);
            app.board = Default::default();
            app.winner = None;
            app.wants_rematch = false;
            app.opponent_wants_rematch = false;
            app.messages.push("Match found!".to_string());
        }
        ServerMessage::Move { square } => {
            // Opponent moved
            // Determine symbol
            let opponent_symbol = if app.my_symbol.as_deref() == Some("X") { "O" } else { "X" };
            if square < 9 {
                 app.board[square] = Some(opponent_symbol.to_string());
            }
        }
        ServerMessage::End { result, winner } => {
            if result == "win" {
                if let Some(w) = winner {
                    app.winner = Some(w.clone());
                    app.messages.push(format!("Game Over! Winner: {}", w));
                }
            } else {
                 app.winner = Some("Draw".to_string());
                 app.messages.push("Game Over! Draw".to_string());
            }
        }
        ServerMessage::Error { message } => {
            app.messages.push(format!("Error: {}", message));
        }
        ServerMessage::RematchUpdate { other_player_voted } => {
            app.opponent_wants_rematch = other_player_voted;
            app.messages.push(format!("Opponent rematch vote: {}", other_player_voted));
        }
    }
}
