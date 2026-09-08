//! sidecar/mod.rs — 跨平台 sidecar 启动抽象
//!
//! Windows:  sidecar::windows(Job Object + CREATE_NO_WINDOW)
//! macOS/Linux: sidecar::unix  (空实现 + 显式 SIGKILL 兜底)
//!
//! main.rs 通过 cfg 选边:
//!   #[cfg(target_os = "windows")] pub use windows::*;
//!   #[cfg(not(target_os = "windows")))] pub use unix::*;

#[cfg(target_os = "windows")]
pub mod windows;

#[cfg(not(target_os = "windows"))]
pub mod unix;

#[cfg(target_os = "windows")]
pub use windows::*;

#[cfg(not(target_os = "windows"))]
pub use unix::*;
