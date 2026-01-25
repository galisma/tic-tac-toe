
pub enum CurrentScreen {
    MainMenu,
    Searching,
    Game,
}

pub struct App {
    pub current_screen: CurrentScreen,
    pub board: [Option<String>; 9],
    pub my_symbol: Option<String>,
    pub messages: Vec<String>,
    pub input_buffer: String,
    pub winner: Option<String>,
    pub running: bool,
    pub wants_rematch: bool,
    pub opponent_wants_rematch: bool,
    pub is_chatting: bool,
}

impl App {
    pub fn new() -> App {
        App {
            current_screen: CurrentScreen::MainMenu,
            board: Default::default(),
            my_symbol: None,
            messages: Vec::new(),
            input_buffer: String::new(),
            winner: None,
            running: true,
            wants_rematch: false,
            opponent_wants_rematch: false,
            is_chatting: false,
        }
    }
}
