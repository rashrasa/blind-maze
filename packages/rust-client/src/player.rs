pub struct Player {
    uuid: String,
    display_name: String,
    /// RGBA
    color: (u8, u8, u8, f32),
    avatar_url: String,
}

impl Player {
    pub fn new(
        uuid: String,
        display_name: String,
        color: (u8, u8, u8, f32),
        avatar_url: String,
    ) -> Self {
        return Player {
            uuid: uuid,
            display_name: display_name,
            color: color,
            avatar_url: avatar_url,
        };
    }
    pub fn get_id(&self) -> &str {
        return &self.display_name;
    }
}

pub struct PlayerState {
    player: Player,
    pub position: (f64, f64),
    pub velocity: (f64, f64),
}

impl PlayerState {
    pub fn new(player: Player, position: (f64, f64), velocity: (f64, f64)) -> Self {
        return PlayerState {
            player: player,
            position: position,
            velocity: velocity,
        };
    }

    // Main tick logic lives here for now
    pub fn tick(&mut self, ms: f64) {
        self.position = (
            self.position.0 + self.velocity.0 * ms / 1000.0,
            self.position.1 + self.velocity.1 * ms / 1000.0,
        )
    }

    pub fn get_pos(&self) -> &(f64, f64) {
        return &self.position;
    }

    pub fn get_player(&self) -> &Player {
        return &self.player;
    }
}
