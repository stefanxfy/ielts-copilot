//! src-tauri/src/main.rs — Tauri 壳:sidecar 生命周期(docs/桌面App分发方案设计.md §5.4)
//!
//! 职责链(复刻 scripts/start-windows.ps1 已验证语义):
//!   1) 数据目录 portable 双态:安装根可写 → 就地 data/;否则 %APPDATA%\ielts-copilot\data
//!   2) 首启 config.json 缺失 → 从随包 config.example.json 复制(apiKey 为空)
//!   3) 读 config.json 端口(JSONC 容注释,缺省 3177);被占用则 +1 递增(上限 +20)
//!   4) spawn runtime/node.exe server/server.js(env 注入 IELTS_APP_ROOT /
//!      IELTS_DATA_ROOT / IELTS_CONFIG_ROOT,src/lib/paths.ts 双态解析对接)
//!      · 不注入 IELTS_HEARTBEAT_EXIT —— 桌面态「关窗=退出」,心跳看门狗是浏览器形态语义
//!   5) Job Object(KILL_ON_JOB_CLOSE):主进程退出即回收 node 进程树,杜绝孤儿
//!   6) /api/health 轮询 60s → 通过后 WebView 从 loading 页 navigate 到服务地址
//!
//! 构建期布局(tauri.conf.json resources,CI 组装):
//!   <resource_dir>/server/         ← next-server 内容平铺(server.js + public + …)
//!   <resource_dir>/runtime/node.exe
//!   <resource_dir>/config.example.json

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};

use tauri::Manager;

const DEFAULT_PORT: u16 = 3177;
const MAX_PORT_STEP: u32 = 20;
const HEALTH_TIMEOUT_SECS: u64 = 60;
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// sidecar 句柄:正常退出由 Job Object 兜底,此处仅存引用供 RunEvent::Exit 显式 kill
struct ServerProc(Mutex<Option<Child>>);

fn main() {
    let server = ServerProc(Mutex::new(None));

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 二次启动:聚焦已有窗口(单实例语义,§5.6)
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
                let _ = win.set_focus();
            }
        }))
        .manage(server)
        .setup(|app| {
            let handle = app.handle().clone();
            thread::spawn(move || bootstrap(handle));
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Tauri 初始化失败")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                if let Some(s) = app.try_state::<ServerProc>() {
                    if let Ok(mut guard) = s.0.lock() {
                        if let Some(child) = guard.as_mut() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        });
}

/// 主引导:在后台线程执行,任何失败都落到 loading 页 + 日志,绝不 panic 崩壳
fn bootstrap(app: tauri::AppHandle) {
    let fail = |win: &tauri::WebviewWindow, msg: &str| {
        let _ = win.eval(&format!(
            "window.__set_status && window.__set_status({});",
            serde_json::to_string(msg).unwrap_or_else(|_| "\"启动失败\"".into())
        ));
        log(&format!("[bootstrap] {msg}"));
    };

    let Some(win) = app.get_webview_window("main") else {
        eprintln!("[bootstrap] 主窗口不存在");
        return;
    };

    let Ok(resource_dir) = app.path().resource_dir() else {
        fail(&win, "无法定位安装资源目录");
        return;
    };
    let server_root = resource_dir.join("server");
    let node_exe = resource_dir.join("runtime").join("node.exe");
    let entry = server_root.join("server.js");
    for (label, p) in [
        ("server/server.js", &entry),
        ("runtime/node.exe", &node_exe),
    ] {
        if !p.exists() {
            fail(&win, &format!("缺少 {label},安装包可能不完整"));
            return;
        }
    }

    // 1) 数据目录 portable 双态(§5.5 D3)
    let data_dir = pick_data_dir(&resource_dir);
    if let Err(e) = std::fs::create_dir_all(&data_dir) {
        fail(&win, &format!("数据目录不可创建:{e}"));
        return;
    }
    log_to(&data_dir, "[bootstrap] 桌面壳启动");

    // 2) 首启 config.json(从随包样板复制;分发者 key 不入包)
    let config_path = data_dir.join("config.json");
    let example = resource_dir.join("config.example.json");
    if !config_path.exists() && example.exists() {
        if let Err(e) = std::fs::copy(&example, &config_path) {
            fail(&win, &format!("config.json 生成失败:{e}"));
            return;
        }
        log_to(&data_dir, "[bootstrap] 已从 config.example.json 生成 config.json");
    }

    // 3) 端口:读 JSONC → 占用 +1(上限 +20,不写回)
    let base_port = read_port(&config_path).unwrap_or(DEFAULT_PORT);
    let mut port = base_port;
    for step in 0..=MAX_PORT_STEP {
        if port_free(port) {
            break;
        }
        if step == MAX_PORT_STEP {
            fail(&win, &format!("端口 {base_port}~{} 全被占用", base_port + MAX_PORT_STEP));
            return;
        }
        port += 1;
    }
    if port != base_port {
        log_to(&data_dir, &format!("[bootstrap] 端口 {base_port} 被占用 → 改用 {port}"));
    }

    // 4) spawn sidecar(env 契约与 src/lib/paths.ts 对接)
    let _ = win.eval("window.__set_status && window.__set_status('正在启动本地服务…');");
    let mut command = Command::new(&node_exe);
    command
        .arg(&entry)
        .current_dir(&server_root)
        .env("PORT", port.to_string())
        .env("HOSTNAME", "127.0.0.1")
        .env("IELTS_APP_ROOT", &server_root)
        .env("IELTS_DATA_ROOT", &data_dir)
        .env("IELTS_CONFIG_ROOT", &data_dir)
        .stdin(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = match command.spawn() {
        Ok(c) => c,
        Err(e) => {
            fail(&win, &format!("node 服务启动失败:{e}"));
            return;
        }
    };
    attach_job_object(&child);
    let pid = child.id();
    log_to(&data_dir, &format!("[bootstrap] node PID {pid} → http://127.0.0.1:{port}"));

    // 5) 健康轮询 60s
    let deadline = Instant::now() + Duration::from_secs(HEALTH_TIMEOUT_SECS);
    let mut ready = false;
    loop {
        if let Ok(Some(status)) = child.try_wait() {
            fail(&win, &format!("本地服务提前退出(退出码 {:?}),请重装或反馈日志", status.code()));
            return;
        }
        if health_ok(port) {
            ready = true;
            break;
        }
        if Instant::now() >= deadline {
            break;
        }
        thread::sleep(Duration::from_millis(500));
    }
    if !ready {
        let _ = child.kill();
        fail(&win, &format!("服务 {HEALTH_TIMEOUT_SECS} 秒内未就绪,请重启应用"));
        return;
    }

    // 6) WebView 从 loading 页切到真实服务地址(前端零改动,G3)
    let url = format!("http://127.0.0.1:{port}");
    if let Err(e) = win.navigate(tauri::Url::parse(&url).expect("URL 解析失败")) {
        fail(&win, &format!("页面导航失败:{e}"));
        return;
    }
    log_to(&data_dir, &format!("[bootstrap] 就绪:{url}"));

    if let Some(s) = app.try_state::<ServerProc>() {
        if let Ok(mut guard) = s.0.lock() {
            *guard = Some(child);
        }
    }
}

/* ---------- 数据目录 portable 双态 ---------- */

/// resource_dir 可写(NSIS per-user 装到 %LOCALAPPDATA%\Programs,必然可写)→ 就地 data/
/// 「文件夹即应用」延续;不可写(Program Files 类安装)→ %APPDATA%\ielts-copilot\data
fn pick_data_dir(resource_dir: &Path) -> PathBuf {
    if is_writable_dir(resource_dir) {
        return resource_dir.join("data");
    }
    let appdata = std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));
    appdata.join("ielts-copilot").join("data")
}

fn is_writable_dir(dir: &Path) -> bool {
    if !dir.exists() {
        return false;
    }
    let probe = dir.join(".write-test");
    match std::fs::File::create(&probe) {
        Ok(f) => {
            drop(f);
            let _ = std::fs::remove_file(&probe);
            true
        }
        Err(_) => false,
    }
}

/* ---------- 端口与健康检查 ---------- */

fn port_free(port: u16) -> bool {
    TcpListener::bind(("127.0.0.1", port)).is_ok()
}

/// 裸 TCP 发 GET /api/health,状态行 200 即就绪(不引 HTTP 库)
fn health_ok(port: u16) -> bool {
    let addr = format!("127.0.0.1:{port}");
    let Ok(mut stream) =
        TcpStream::connect_timeout(&addr.parse().expect("addr"), Duration::from_secs(2))
    else {
        return false;
    };
    let req = format!("GET /api/health HTTP/1.0\r\nHost: {addr}\r\n\r\n");
    if stream.write_all(req.as_bytes()).is_err() {
        return false;
    }
    let mut buf = [0u8; 64];
    let n = stream.read(&mut buf).unwrap_or(0);
    let head = String::from_utf8_lossy(&buf[..n]);
    head.starts_with("HTTP/1.1 200") || head.starts_with("HTTP/1.0 200")
}

/* ---------- JSONC 端口解析(迷你状态机:跳过字符串与注释) ---------- */

/// 从 JSONC 文本提取 "server"."port"(容 // 与 /* */ 注释;失败回退 None)
fn read_port(path: &Path) -> Option<u16> {
    let raw = std::fs::read_to_string(path).ok()?;
    let mut cleaned = String::with_capacity(raw.len());
    let mut chars = raw.chars().peekable();
    while let Some(c) = chars.next() {
        match c {
            '"' => {
                cleaned.push(c);
                while let Some(c2) = chars.next() {
                    cleaned.push(c2);
                    if c2 == '\\' {
                        cleaned.push(chars.next()?);
                    } else if c2 == '"' {
                        break;
                    }
                }
            }
            '/' if chars.peek() == Some(&'/') => {
                chars.find(|&c2| c2 == '\n');
                cleaned.push('\n');
            }
            '/' if chars.peek() == Some(&'*') => {
                chars.next();
                loop {
                    match chars.next() {
                        Some('*') if chars.peek() == Some(&'/') => {
                            chars.next();
                            break;
                        }
                        None => break,
                        _ => {}
                    }
                }
            }
            _ => cleaned.push(c),
        }
    }
    let value: serde_json::Value = serde_json::from_str(&cleaned).ok()?;
    let p = value.get("server")?.get("port")?.as_u64()?;
    if p > 0 && p < 65536 { Some(p as u16) } else { None }
}

/* ---------- Job Object:退出回收进程树(§5.4) ---------- */

#[cfg(windows)]
fn attach_job_object(child: &Child) {
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::System::JobObjects::{
        AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
        SetInformationJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    };
    unsafe {
        let job = CreateJobObjectW(std::ptr::null(), std::ptr::null());
        if job == 0 {
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
            if let Some(h) = child.as_raw_handle() {
                AssignProcessToJobObject(job, h);
            }
        }
        // 故意不 CloseHandle:KILL_ON_JOB_CLOSE 保证主进程退出时杀整棵 node 进程树
    }
}

#[cfg(not(windows))]
fn attach_job_object(_child: &Child) {}

/* ---------- 日志(数据目录/desktop.log,真机排障用) ---------- */

fn log(msg: &str) {
    let Some(dir) = resolve_log_dir() else { return };
    log_to(&dir, msg);
}

fn resolve_log_dir() -> Option<PathBuf> {
    let appdata = std::env::var("APPDATA").ok()?;
    Some(PathBuf::from(appdata).join("ielts-copilot").join("data"))
}

fn log_to(dir: &Path, msg: &str) {
    use std::io::Write as _;
    let _ = std::fs::create_dir_all(dir);
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(dir.join("desktop.log"))
    {
        let _ = writeln!(f, "{} {msg}", chrono_like_now());
    }
}

/// 轻量时间戳(不引 chrono):YYYY-MM-DD HH:MM:SS(本地时间近似)
fn chrono_like_now() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let days = secs / 86400;
    let rem = secs % 86400;
    let (h, m, s) = (rem / 3600, (rem % 3600) / 60, rem % 60);
    // 平铺日期换算(1970-01-01 起,民用近似;日志用途足够)
    let mut year = 1970i64;
    let mut day = days as i64;
    loop {
        let leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
        let len = if leap { 366 } else { 365 };
        if day < len { break; }
        day -= len;
        year += 1;
    }
    let leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
    let month_lens = [31, if leap { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut month = 1;
    for len in month_lens {
        if day < len { break; }
        day -= len;
        month += 1;
    }
    format!("{year:04}-{month:02}-{day:02} {h:02}:{m:02}:{s:02} (UTC)")
}
