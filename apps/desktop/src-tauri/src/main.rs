// On Windows release builds, hide the console window that would otherwise
// appear behind the app window.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    soundblart_lib::run();
}
