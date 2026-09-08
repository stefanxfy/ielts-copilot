//! sidecar/windows.rs — Windows 专属 sidecar 启动逻辑
//!
//! 包含两件事:
//!   1) `spawn_node_with_hidden_console` —— CommandExt::creation_flags(CREATE_NO_WINDOW)
//!      抑制 node 子进程的弹窗
//!   2) `attach_job_object` —— Windows Job Object(KILL_ON_JOB_CLOSE),
//!      主进程退出即回收 node 进程树,杜绝孤儿
//!
//! 这两个 API 都是 Windows 专属(macOS / Linux 用 #[cfg(not(windows))] 走 sidecar/unix.rs)。

use std::os::windows::io::AsRawHandle;
use std::process::Child;
use windows_sys::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
    SetInformationJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
};

/// CREATE_NO_WINDOW 标志位 —— 启动 node 子进程时不弹控制台黑窗
pub const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// 给 Command 加 CREATE_NO_WINDOW 标志
pub fn apply_no_window_flag(cmd: &mut std::process::Command) {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(CREATE_NO_WINDOW);
}

/// 启动后立刻把子进程 attach 到 Job Object(KILL_ON_JOB_CLOSE),
/// 父进程退出 → 整棵 node 进程树被回收。
/// 失败仅警告,不 panic。
pub fn attach_job_object(child: &Child) {
    unsafe {
        let job = CreateJobObjectW(std::ptr::null(), std::ptr::null());
        if job.is_null() {
            return;
        }
        let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        let ok = SetInformationJobObject(
            job,
            JobObjectExtendedLimitInformation,
            &info as *const _ as *const core::ffi::c_void,
            std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
        );
        if ok != 0 {
            let h = child.as_raw_handle();
            AssignProcessToJobObject(job, h);
        }
        // 故意不 CloseHandle:KILL_ON_JOB_CLOSE 保证主进程退出时杀整棵 node 进程树
    }
}
