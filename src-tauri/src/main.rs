#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    velopack::VelopackApp::build()
        .set_auto_apply_on_startup(false)
        .run();
    t_helper_lib::run();
}
