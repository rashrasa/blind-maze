pub struct InputState {
    pub up: bool,
    pub down: bool,
    pub left: bool,
    pub right: bool,
}
impl Default for InputState {
    fn default() -> InputState {
        return InputState {
            up: false,
            down: false,
            left: false,
            right: false,
        };
    }
}
