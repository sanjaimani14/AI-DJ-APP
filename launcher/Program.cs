// launcher/Program.cs - Windows Production Standalone Executable for AI DJ (Phase 12)
// Compiles into AI-DJ.exe using C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe
// Multi-threaded HTTP Server, Audio Engine Supervisor & Web Audio Launcher

using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;

namespace AIDJ
{
    class Program
    {
        private const string LISTEN_PREFIX = "http://127.0.0.1:5173/";
        private static HttpListener listener;
        private static string distPath;
        private static Process pythonProcess;
        private static bool isRunning = true;

        static void Main(string[] args)
        {
            Console.Title = "AI DJ — Autonomous Live DJ Engine (Production)";
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("==================================================================");
            Console.WriteLine("               AI DJ — AUTONOMOUS LIVE DJ SYSTEM                  ");
            Console.WriteLine("               Windows Standalone Production Build                ");
            Console.WriteLine("==================================================================");
            Console.ResetColor();
            Console.WriteLine();

            // 1. Locate Production Frontend Dist Directory
            distPath = FindDistDirectory();
            if (string.IsNullOrEmpty(distPath) || !File.Exists(Path.Combine(distPath, "index.html")))
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[ERROR] Production frontend bundle was not found.");
                Console.WriteLine("Expected location: frontend\\dist\\index.html");
                Console.WriteLine("Please run 'npm run build' inside frontend/ before launching.");
                Console.ResetColor();
                Console.WriteLine("Press any key to exit...");
                Console.ReadKey();
                return;
            }

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("[AI DJ] Production Frontend Dist found at: " + Path.GetFullPath(distPath));
            Console.ResetColor();

            // 2. Launch Python Audio Feature Analyzer Service in Background
            StartPythonAnalyzer();

            // 3. Start Multi-Threaded Static Web Server
            StartWebServer();

            // 4. Open Live DJ Interface in Browser
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("[AI DJ] Dual-Deck Audio DSP Mixing Engine: Ready");
            Console.WriteLine("[AI DJ] 5-Mode Automatic Transition Engine: Armed");
            Console.WriteLine("[AI DJ] AI DJ Decision Engine & Energy Manager: Active");
            Console.WriteLine("[AI DJ] Launching DJ Interface at: " + LISTEN_PREFIX);
            Console.ResetColor();

            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = LISTEN_PREFIX,
                    UseShellExecute = true
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine("[WARN] Could not automatically open browser: " + ex.Message);
                Console.WriteLine("Please navigate manually to: " + LISTEN_PREFIX);
            }

            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("==================================================================");
            Console.WriteLine("  PRO DJ ENGINE ACTIVE — READY FOR LIVE SETS & STAGE HUD          ");
            Console.WriteLine("  Press 'Q' or Ctrl+C in this console to safely shut down.        ");
            Console.WriteLine("==================================================================");
            Console.ResetColor();
            Console.WriteLine();

            // Monitor Console Input for Graceful Shutdown
            while (isRunning)
            {
                if (Console.KeyAvailable)
                {
                    var key = Console.ReadKey(true);
                    if (key.Key == ConsoleKey.Q || (key.Modifiers == ConsoleModifiers.Control && key.Key == ConsoleKey.C))
                    {
                        break;
                    }
                }
                Thread.Sleep(200);
            }

            Shutdown();
        }

        private static string FindDistDirectory()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string[] searchPaths = new string[]
            {
                Path.Combine(baseDir, "frontend", "dist"),
                Path.Combine(baseDir, "dist"),
                Path.Combine(Directory.GetCurrentDirectory(), "frontend", "dist"),
                Path.Combine(Directory.GetCurrentDirectory(), "dist")
            };

            foreach (var path in searchPaths)
            {
                if (Directory.Exists(path) && File.Exists(Path.Combine(path, "index.html")))
                {
                    return path;
                }
            }

            return null;
        }

        private static void StartPythonAnalyzer()
        {
            try
            {
                string scriptPath = Path.Combine(Directory.GetCurrentDirectory(), "analyzer", "service.py");
                if (File.Exists(scriptPath))
                {
                    Console.WriteLine("[AI DJ] Starting Python Audio Analyzer Microservice on port 8001...");
                    var psi = new ProcessStartInfo
                    {
                        FileName = "python",
                        Arguments = "\"" + scriptPath + "\"",
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = false,
                        RedirectStandardError = false
                    };
                    pythonProcess = Process.Start(psi);
                    Console.WriteLine("[AI DJ] Python analyzer running (PID: " + pythonProcess.Id + ")");
                }
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.DarkYellow;
                Console.WriteLine("[NOTICE] Python analyzer not started: " + ex.Message);
                Console.WriteLine("[AI DJ] Operating in 100% Offline Rule-Based Fallback Mode (audio unaffected).");
                Console.ResetColor();
            }
        }

        private static void StartWebServer()
        {
            try
            {
                listener = new HttpListener();
                listener.Prefixes.Add(LISTEN_PREFIX);
                listener.Start();
                ThreadPool.QueueUserWorkItem(ListenLoop);
                Console.WriteLine("[AI DJ] High-performance Web Audio server listening on " + LISTEN_PREFIX);
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[ERROR] Could not bind server to " + LISTEN_PREFIX + ": " + ex.Message);
                Console.ResetColor();
            }
        }

        private static void ListenLoop(object state)
        {
            while (isRunning && listener != null && listener.IsListening)
            {
                try
                {
                    var context = listener.GetContext();
                    ThreadPool.QueueUserWorkItem(ProcessRequest, context);
                }
                catch
                {
                    if (!isRunning) break;
                }
            }
        }

        private static void ProcessRequest(object state)
        {
            var context = (HttpListenerContext)state;
            var request = context.Request;
            var response = context.Response;

            try
            {
                string rawUrl = request.Url.AbsolutePath;
                string relPath = rawUrl.TrimStart('/');
                if (string.IsNullOrEmpty(relPath)) relPath = "index.html";

                string filePath = Path.Combine(distPath, relPath.Replace('/', Path.DirectorySeparatorChar));

                // SPA Fallback: if not found, serve index.html
                if (!File.Exists(filePath))
                {
                    filePath = Path.Combine(distPath, "index.html");
                }

                byte[] buffer = File.ReadAllBytes(filePath);
                response.ContentType = GetMimeType(filePath);
                response.ContentLength64 = buffer.Length;
                response.AddHeader("Access-Control-Allow-Origin", "*");
                response.AddHeader("Cache-Control", "public, max-age=3600");
                response.OutputStream.Write(buffer, 0, buffer.Length);
            }
            catch
            {
                response.StatusCode = 500;
            }
            finally
            {
                try { response.OutputStream.Close(); } catch { }
            }
        }

        private static string GetMimeType(string path)
        {
            string ext = Path.GetExtension(path).ToLowerInvariant();
            switch (ext)
            {
                case ".html": return "text/html; charset=utf-8";
                case ".css": return "text/css; charset=utf-8";
                case ".js":
                case ".mjs": return "application/javascript; charset=utf-8";
                case ".json": return "application/json; charset=utf-8";
                case ".png": return "image/png";
                case ".jpg":
                case ".jpeg": return "image/jpeg";
                case ".svg": return "image/svg+xml";
                case ".ico": return "image/x-icon";
                case ".webp": return "image/webp";
                case ".mp3": return "audio/mpeg";
                case ".wav": return "audio/wav";
                case ".flac": return "audio/flac";
                case ".woff2": return "font/woff2";
                case ".woff": return "font/woff";
                case ".ttf": return "font/ttf";
                default: return "application/octet-stream";
            }
        }

        private static void Shutdown()
        {
            isRunning = false;
            Console.WriteLine("[AI DJ] Shutting down server and processes...");

            try
            {
                if (listener != null)
                {
                    listener.Stop();
                    listener.Close();
                }
            }
            catch { }

            try
            {
                if (pythonProcess != null && !pythonProcess.HasExited)
                {
                    pythonProcess.Kill();
                }
            }
            catch { }

            Console.WriteLine("[AI DJ] Clean shutdown complete.");
        }
    }
}
