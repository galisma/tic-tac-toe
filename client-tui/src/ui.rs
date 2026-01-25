use crate::app::{App, CurrentScreen};
use ratatui::{
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Style, Stylize},
    text::Line,
    widgets::{Block, Borders, Paragraph, Wrap},
    Frame,
};

pub fn render(app: &App, frame: &mut Frame) {
    let size = frame.area();

    match app.current_screen {
        CurrentScreen::MainMenu => render_main_menu(frame, size),
        CurrentScreen::Searching => render_searching(frame, size),
        CurrentScreen::Game => render_game(app, frame, size),
    }
}

fn render_main_menu(frame: &mut Frame, area: Rect) {
    let text = vec![
        Line::from("Welcome to Tic-Tac-Toe TUI").bold().yellow(),
        Line::from(""),
        Line::from("Press 's' to search for a game"),
        Line::from("Press 'q' to quit"),
    ];
    let block = Block::default()
        .borders(Borders::ALL)
        .title("Main Menu")
        .style(Style::default());
    let paragraph = Paragraph::new(text)
        .block(block)
        .alignment(Alignment::Center);

    let area = centered_rect(60, 20, area);
    frame.render_widget(paragraph, area);
}

fn render_searching(frame: &mut Frame, area: Rect) {
    let text = vec![
        Line::from("Searching for a match...").green().slow_blink(),
        Line::from(""),
        Line::from("Press 'q' to cancel"),
    ];
    let block = Block::default()
        .borders(Borders::ALL)
        .title("Matchmaking");
    let paragraph = Paragraph::new(text)
        .block(block)
        .alignment(Alignment::Center);
        
    let area = centered_rect(60, 20, area);
    frame.render_widget(paragraph, area);
}

fn render_game(app: &App, frame: &mut Frame, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(area);

    render_board(app, frame, chunks[0]);
    render_info(app, frame, chunks[1]);
}

fn render_board(app: &App, frame: &mut Frame, area: Rect) {
    let title = format!(
        "Game - You are {}", 
        app.my_symbol.as_deref().unwrap_or("?")
    );
    let block = Block::default().borders(Borders::ALL).title(title);
    frame.render_widget(block, area);

    let board_area = centered_rect(40, 60, area);
    
    let rows = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(3), Constraint::Length(3), Constraint::Length(3)])
        .split(board_area);

    for (row_idx, row_area) in rows.iter().enumerate() {
        let cols = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([Constraint::Length(5), Constraint::Length(5), Constraint::Length(5)])
            .split(*row_area);
            
        for (col_idx, cell_area) in cols.iter().enumerate() {
            let index = row_idx * 3 + col_idx;
            let val = &app.board[index];
            
            let content = if let Some(s) = val {
                s.clone()
            } else {
                index.to_string()
            };
            
            let style = if let Some(s) = val {
                if s == "X" {
                    Style::default().fg(Color::Red)
                } else {
                    Style::default().fg(Color::Blue)
                }
            } else {
                Style::default().fg(Color::DarkGray)
            };

            let cell = Paragraph::new(content)
                .block(Block::default().borders(Borders::ALL))
                .style(style)
                .alignment(Alignment::Center);
                
            frame.render_widget(cell, *cell_area);
        }
    }
    
    if let Some(winner) = &app.winner {
        let text = format!("Winner: {}", winner);
        let p = Paragraph::new(text).style(Style::default().fg(Color::Green).bold()).alignment(Alignment::Center);
        let rect = Rect::new(board_area.x, board_area.y + 10, board_area.width, 1);
        frame.render_widget(p, rect);
    } // Needs more robust positioning but okay for MVP
}

fn render_info(app: &App, frame: &mut Frame, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Min(1), Constraint::Length(3)])
        .split(area);
        
    let messages: Vec<Line> = app.messages.iter().map(|s| Line::from(s.as_str())).collect();
    let msg_block = Block::default().borders(Borders::ALL).title("Messages");
    let msg_p = Paragraph::new(messages)
        .block(msg_block)
        .wrap(Wrap { trim: true });
    frame.render_widget(msg_p, chunks[0]);
    
    let input_block = Block::default().borders(Borders::ALL).title("Input (Type message + Enter)");
    let input_p = Paragraph::new(app.input_buffer.as_str())
        .block(input_block);
    frame.render_widget(input_p, chunks[1]);
}

fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(r);

    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(popup_layout[1])[1]
}
