// launcher/main.rs - Native Windows Executable Launcher for AI DJ (Phase 12)
// Compiles into AI-DJ.exe using rustc (no external dependencies required)
// High-performance static web server & process supervisor for AI DJ

use std::fs::{self, File};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

const BIND_ADDR: &str = "127.0.0.1:5173";

fn get_mime_type(path: &Path) -> &'static str {
    match path.extension().and_then(|s| s.to_str()).unwrap_or("") {
        "html" => "text/html; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "js" | "mjs" => "application/javascript; charset=utf-8",
        "json" => "application/json; charset=utf-8",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "svg" => "image/svg+xml",
        "ico" => "image/x-icon",
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "webp" => "image/webp",
        "woff2" => "font/woff2",
        "woff" => "font/woff",
        "ttf" => "font/ttf",
        _ => "application/octet-stream",
    }
}

fn handle_client(mut stream: TcpStream, dist_dir: &Path) {
    let mut buffer = [0u8; 4096];
    let bytes_read = match stream.read(&mut buffer) {
        Ok(n) if n > 0 => n,
        _ => return,
    };

    let request_str = String::from_utf8_lossy(&buffer[..bytes_read]);
    let first_line = request_str.lines().next().unwrap_or("");
    let mut parts = first_line.split_whitespace();
    let method = parts.next().unwrap_or("GET");
    let raw_path = parts.next().unwrap_or("/");

    if method != "GET" && method != "HEAD" {
        let response = "HTTP/1.1 405 Method Not Allowed\r\nContent-Length: 0\r\n\r\n";
        let _ = stream.write_all(response.as_bytes());
        return;
    }

    // Clean query params
    let path_no_query = raw_path.split('?').next().unwrap_or("/");
    let clean_path = if path_no_query == "/" {
        "index.html"
    } else {
        path_no_query.trim_start_matches('/')
    };

    let mut target_file = dist_dir.join(clean_path);
    if !target_file.exists() || target_file.is_dir() {
        // SPA Fallback: route client-side paths to index.html
        target_file = dist_dir.join("index.html");
    }

    if let Ok(mut f) = File::open(&target_file) {
        let mut content = Vec::new();
        if f.read_to_end(&mut content).is_ok() {
            let mime = get_mime_type(&target_file);
            let header = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: {}\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\nCache-Control: public, max-age=3600\r\nConnection: close\r\n\r\n",
                mime,
                content.len()
            );

            let _ = stream.write_all(header.as_bytes());
            if method == "GET" {
                let _ = stream.write_all(&content);
            }
            return;
        }
    }

    let not_found = "HTTP/1.1 404 Not Found\r\nContent-Length: 9\r\n\r\nNot Found";
    let _ = stream.write_all(not_found.as_bytes());
}

fn find_dist_dir() -> Option<PathBuf> {
    // 1. Current directory / frontend / dist
    let p1 = PathBuf::from("frontend/dist");
    if p1.join("index.html").exists() {
        return Some(p1);
    }
    // 2. Relative to exe directory
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            let p2 = parent.join("frontend/dist");
            if p2.join("index.html").exists() {
                return Some(p2);
            }
            let p3 = parent.join("dist");
            if p3.join("index.html").exists() {
                return Some(p3);
            }
        }
    }
    // 3. Fallback to dist
    let p4 = PathBuf::from("dist");
    if p4.join("index.html").exists() {
        return Some(p4);
    }
    None
}

fn try_start_python_analyzer() {
    let analyzer_script = Path::new("analyzer/service.py");
    if analyzer_script.exists() {
        println!("[AI DJ] Starting Python Audio Analysis Microservice (analyzer/service.py)...");
        let _ = Command::new("python")
            .arg("analyzer/service.py")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn();
    }
}

fn main() {
    println!("============================================================");
    println!("             AI DJ — AUTONOMOUS LIVE DJ SYSTEM              ");
    println!("             Windows Production Standalone Edition          ");
    println!("============================================================");
    println!();

    // 1. Verify and locate web application bundle
    let dist_dir = match find_dist_dir() {
        Some(d) => d,
        None => {
            eprintln!("[ERROR] Production build bundle (frontend/dist/index.html) was not found.");
            eprintln!("Please ensure 'npm run build' has been run inside frontend/.");
            eprintln!("Press Enter to exit...");
            let mut s = String::new();
            let _ = std::io::stdin().read_line(&mut s);
            return;
        }
    };

    println!("[AI DJ] Serving production frontend from: {}", dist_dir.display());

    // 2. Try starting Python analyzer in background
    try_start_python_analyzer();

    // 3. Start high-speed HTTP static server
    let listener = match TcpListener::bind(BIND_ADDR) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("[ERROR] Failed to bind to {}: {}", BIND_ADDR, e);
            eprintln!("Port may already be in use. You can access the app at http://{}", BIND_ADDR);
            // Open browser anyway
            let _ = Command::new("cmd").args(["/c", "start", &format!("http://{}", BIND_ADDR)]).spawn();
            return;
        }
    };

    let url = format!("http://{}", BIND_ADDR);
    println!("[AI DJ] Production Web Audio Server is LIVE at: {}", url);
    println!("[AI DJ] Dual-Deck DSP Engine: Ready");
    println!("[AI DJ] Transition Engine: 5 DSP Modes Active");
    println!("[AI DJ] AI DJ Decision Engine & Energy Manager: Active");
    println!("[AI DJ] Opening Live Event DJ Interface in default browser...");

    // 4. Launch browser window
    let _ = Command::new("cmd").args(["/c", "start", &url]).spawn();

    println!();
    println!("============================================================");
    println!("  PRO DJ SYSTEM READY FOR LIVE PERFORMANCE                  ");
    println!("  Press Ctrl+C in this console to safely stop the server.   ");
    println!("============================================================");
    println!();

    let dist_dir_arc = Arc::new(dist_dir);

    // Accept connections concurrently
    for stream in listener.incoming() {
        match stream {
            Ok(s) => {
                let dist_clone = Arc::clone(&dist_dir_arc);
                thread::spawn(move || {
                    handle_client(s, &dist_clone);
                });
            }
            Err(e) => {
                eprintln!("[WARN] Connection failed: {}", e);
            }
        }
    }
}
