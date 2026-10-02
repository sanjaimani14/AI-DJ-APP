"""
analyzer/service.py - AI DJ Audio Analysis HTTP & SSE Service
Provides local REST and SSE API for communication between the desktop app
and the Python audio-analysis engine.
Runs by default on http://127.0.0.1:8001
"""

import os
import sys
import json
import asyncio
import logging
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

# Ensure root folder is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from analyzer.engine import engine_instance
from database.db import db_instance

ai_engine_dir = os.path.join(BASE_DIR, "ai-engine")
if ai_engine_dir not in sys.path:
    sys.path.insert(0, ai_engine_dir)
from planner import planner_instance

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ai_dj.service")

app = FastAPI(
    title="AI DJ Audio Analysis Engine",
    description="Deterministic Phase 3 Local Audio Analysis Pipeline",
    version="1.0.0"
)

# Enable CORS for Vite and desktop wrappers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    file_path: str
    force_reanalyze: bool = False
    track_id: Optional[str] = None


class BatchAnalyzeRequest(BaseModel):
    file_paths: List[str]
    force_reanalyze: bool = False


class PlanRequest(BaseModel):
    current_track: Dict[str, Any]
    library: Optional[List[Dict[str, Any]]] = None
    event_profile: str = "Party"
    active_deck: str = "A"


@app.post("/api/ai/plan")
def get_ai_decision(req: PlanRequest):
    """
    Phase 7 AI DJ Planner Endpoint.
    Receives structured track information and chooses next track,
    transition type, length, target BPM, and target energy.
    Does NOT process raw audio.
    """
    lib = req.library
    if lib is None:
        lib = engine_instance.get_all_cached_tracks()
    decision = planner_instance.plan_next_track(
        current_track=req.current_track,
        library=lib,
        event_profile=req.event_profile,
        active_deck=req.active_deck
    )
    return decision


@app.get("/api/health")
def health_check():
    """Health status and analysis engine capability confirmation."""
    return {
        "status": "healthy",
        "service": "AI DJ Audio Analysis Engine",
        "version": "1.0.0",
        "backend": "librosa + soundfile + numpy + scipy",
        "database": db_instance.db_path,
        "tracks_cached": len(db_instance.get_all_tracks())
    }


@app.get("/api/tracks")
def get_tracks():
    """Retrieve all tracks cached in SQLite library."""
    tracks = engine_instance.get_all_cached_tracks()
    return {"tracks": tracks, "count": len(tracks)}


@app.post("/api/analyze")
def analyze_track(req: AnalyzeRequest):
    """Analyze a single audio file, utilizing cache if unchanged."""
    if not os.path.exists(req.file_path):
        raise HTTPException(status_code=404, detail=f"File not found: {req.file_path}")

    res = engine_instance.analyze_file(
        file_path=req.file_path,
        force_reanalyze=req.force_reanalyze,
        track_id=req.track_id
    )
    return res


@app.post("/api/reanalyze")
def reanalyze_track(req: AnalyzeRequest):
    """Force re-analysis of a track bypassing the cache."""
    res = engine_instance.reanalyze_track(req.file_path or req.track_id)
    return res


@app.post("/api/upload-and-analyze")
async def upload_and_analyze(
    file: UploadFile = File(...),
    force_reanalyze: bool = Form(False)
):
    """
    Handle audio files uploaded directly from browser file inputs.
    Saves to local music directory and processes through analysis engine.
    """
    upload_dir = os.path.join(BASE_DIR, "demo-music")
    os.makedirs(upload_dir, exist_ok=True)
    
    target_path = os.path.join(upload_dir, file.filename)
    
    # Save file contents
    content = await file.read()
    with open(target_path, "wb") as f:
        f.write(content)

    res = engine_instance.analyze_file(
        file_path=target_path,
        force_reanalyze=force_reanalyze
    )
    # Add relative URL for browser playback
    res["url"] = f"/demo-music/{file.filename}"
    return res


@app.post("/api/batch-analyze")
def batch_analyze(req: BatchAnalyzeRequest):
    """Synchronous batch analysis."""
    results = engine_instance.batch_analyze(
        file_paths=req.file_paths,
        force_reanalyze=req.force_reanalyze
    )
    return {"results": results, "count": len(results)}


@app.get("/api/batch-analyze-sse")
async def batch_analyze_sse(
    file_paths: str = Query(..., description="JSON string array of file paths"),
    force_reanalyze: bool = Query(False)
):
    """
    Server-Sent Events (SSE) stream for batch analysis with live progress bar reporting:
    ANALYZING
    ██████████░░ 72%
    """
    try:
        paths = json.loads(file_paths)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON array in file_paths query")

    async def event_generator():
        total = len(paths)
        for idx, path in enumerate(paths):
            current_num = idx + 1
            filename = os.path.basename(path)
            
            # Send initial progress event before processing file
            start_percent = int((idx / total) * 100)
            yield f"data: {json.dumps({'stage': 'starting', 'current': current_num, 'total': total, 'percent': start_percent, 'filename': filename})}\n\n"
            await asyncio.sleep(0.01)

            # Analyze file in thread pool to avoid blocking event loop
            res = await asyncio.to_thread(engine_instance.analyze_file, path, force_reanalyze)

            end_percent = int((current_num / total) * 100)
            yield f"data: {json.dumps({'stage': 'completed_track', 'current': current_num, 'total': total, 'percent': end_percent, 'filename': filename, 'track': res})}\n\n"
            await asyncio.sleep(0.01)

        yield f"data: {json.dumps({'stage': 'done', 'percent': 100, 'total': total})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.delete("/api/tracks/{track_id}")
def delete_track(track_id: str):
    """Delete a track from the library cache."""
    deleted = db_instance.delete_track(track_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Track not found")
    return {"success": True, "track_id": track_id}


def run_service(host: str = "127.0.0.1", port: int = 8001):
    """Start uvicorn server."""
    logger.info(f"Starting AI DJ Audio Analysis Engine on http://{host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 8001
    run_service(port=port)

