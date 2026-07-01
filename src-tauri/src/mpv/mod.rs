pub mod ipc;
pub mod process;
pub mod protocol;

pub use ipc::MpvIpcClient;
pub use process::{ControllerEvent, MpvController};
