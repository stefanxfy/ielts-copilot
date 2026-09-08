//! sidecar/unix.rs — macOS / Linux 专属 sidecar 启动逻辑
//!
//! macOS / Linux 没有 Windows Job Object 等价物。用以下策略保证
//! 主进程退出时 node 子进程被回收:
//!
//!   1) 启动时用 std::process::Command(Unix 下不弹控制台,无需 CREATE_NO_WINDOW)
//!   2) Rust 主进程监听 SIGTERM/SIGINT,转 SIGKILL 子进程
//!   3) macOS 上 Cocoa 退出事件触发 RunEvent::Exit,走到清理路径
//!
//! 与 Windows 版本 API 同名同形(spawn_no_window_flag / attach_process_group),
//! 让 main.rs 的 cfg 拆分保持对称。

use std::process::Child;

/// Unix 下 Command::spawn 不会弹控制台,空操作占位,保持 API 对称
pub fn apply_no_window_flag(_cmd: &mut std::process::Command) {}

/// macOS / Linux 上把子进程 attach 到新的 process group,
/// 这样父进程退出时不会把信号传播到子进程(默认行为是传播)。
///
/// 我们反而**希望**父进程退出时子进程被杀 —— Unix 上最稳的做法是:
/// - 主进程设 SIGTERM handler,触发后给子进程发 SIGKILL
/// - 这样不依赖 process group,而是显式信号
///
/// 这里仅记录子进程 pid 供外部使用(由 main.rs 在 cleanup 时读)。
pub fn attach_job_object(child: &Child) {
    // 当前仅记录日志用途。真正的清理在 main.rs 的 cleanup 子进程中通过
    // child.id() 拿 pid 发 SIGKILL。
    // 保留空函数以维持与 Windows 模块同名 API。
    let _ = child;
}

/// Unix 下产生 SIGKILL 信号编号常量,方便 main.rs 引用
pub const SIGKILL: i32 = 9;
