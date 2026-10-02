import React, { useState } from 'react';
import type { Track } from '../types/dj';
import { 
  FolderPlus, 
  Search, 
  ArrowUpDown, 
  CheckCircle2 
} from 'lucide-react';

interface LibraryProps {
  tracks: Track[];
  onLoadDeckA: (track: Track) => void;
  onLoadDeckB: (track: Track) => void;
  onSelectNextAI: (track: Track) => void;
  onImportFolder: () => void;
  onReanalyzeTrack?: (track: Track) => void;
  currentDeckATrackId?: string;
  currentDeckBTrackId?: string;
}

export const Library: React.FC<LibraryProps> = ({
  tracks,
  onLoadDeckA,
  onLoadDeckB,
  onSelectNextAI,
  onImportFolder,
  onReanalyzeTrack,
  currentDeckATrackId,
  currentDeckBTrackId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGenre, setFilterGenre] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'title' | 'bpm' | 'key' | 'energy'>('energy');
  const [sortAsc, setSortAsc] = useState(false);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  // Filter and sort
  const filteredTracks = tracks.filter((t) => {
    const matchesSearch = 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.key.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGenre = filterGenre === 'ALL' || t.genre.toLowerCase() === filterGenre.toLowerCase();

    return matchesSearch && matchesGenre;
  }).sort((a, b) => {
    let comp = 0;
    if (sortBy === 'title') comp = a.title.localeCompare(b.title);
    else if (sortBy === 'bpm') comp = (a.bpm || 0) - (b.bpm || 0);
    else if (sortBy === 'key') comp = (a.key || '').localeCompare(b.key || '');
    else if (sortBy === 'energy') comp = (a.energy || 0) - (b.energy || 0);
    return sortAsc ? comp : -comp;
  });

  const genres = ['ALL', 'Tamil / Kuthu', 'EDM', 'Party', 'Chill', 'Romantic'];

  return (
    <div 
      className="glass-panel" 
      style={{ 
        flex: 1, 
        padding: '16px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        overflow: 'hidden'
      }}
    >
      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={onImportFolder}
            className="dj-btn"
            style={{
              background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
              color: 'var(--deck-a-primary)',
              border: '1px solid var(--border-medium)',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '11px',
              display: 'flex',
              gap: '6px'
            }}
          >
            <FolderPlus size={16} /> SELECT MUSIC FOLDER
          </button>

          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {filteredTracks.length} TRACKS IN LIBRARY
          </span>
        </div>

        {/* Search & Genre Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            background: 'var(--bg-surface)', 
            padding: '4px 10px', 
            borderRadius: '6px', 
            border: '1px solid var(--border-subtle)',
            width: '220px'
          }}>
            <Search size={14} color="var(--text-muted)" style={{ marginRight: '6px' }} />
            <input 
              type="text"
              placeholder="Search title, artist, BPM, key..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
                width: '100%'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => setFilterGenre(g)}
                className="dj-btn"
                style={{
                  background: filterGenre === g ? 'var(--bg-card-hover)' : 'transparent',
                  color: filterGenre === g ? '#fff' : 'var(--text-muted)',
                  border: filterGenre === g ? '1px solid var(--deck-a-primary)' : 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px'
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tracks Table */}
      <div style={{ overflowY: 'auto', maxHeight: '280px', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-medium)' }}>
              <th style={{ padding: '8px 12px' }}>STATUS</th>
              <th 
                onClick={() => { setSortBy('title'); setSortAsc(!sortAsc); }}
                style={{ padding: '8px 12px', cursor: 'pointer' }}
              >
                TRACK TITLE / ARTIST
              </th>
              <th 
                onClick={() => { setSortBy('bpm'); setSortAsc(!sortAsc); }}
                style={{ padding: '8px 12px', cursor: 'pointer' }}
              >
                BPM <ArrowUpDown size={11} style={{ verticalAlign: 'middle' }} />
              </th>
              <th 
                onClick={() => { setSortBy('key'); setSortAsc(!sortAsc); }}
                style={{ padding: '8px 12px', cursor: 'pointer' }}
              >
                KEY <ArrowUpDown size={11} style={{ verticalAlign: 'middle' }} />
              </th>
              <th 
                onClick={() => { setSortBy('energy'); setSortAsc(!sortAsc); }}
                style={{ padding: '8px 12px', cursor: 'pointer' }}
              >
                ENERGY <ArrowUpDown size={11} style={{ verticalAlign: 'middle' }} />
              </th>
              <th style={{ padding: '8px 12px' }}>GENRE</th>
              <th style={{ padding: '8px 12px' }}>TIME</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>DECK ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredTracks.map((trk) => {
              const isLoadedA = currentDeckATrackId === trk.id;
              const isLoadedB = currentDeckBTrackId === trk.id;

              return (
                <tr 
                  key={trk.id}
                  style={{ 
                    borderBottom: '1px solid var(--border-subtle)',
                    background: isLoadedA ? 'rgba(0, 229, 255, 0.04)' : isLoadedB ? 'rgba(255, 0, 127, 0.04)' : 'transparent',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.background = isLoadedA ? 'rgba(0, 229, 255, 0.04)' : isLoadedB ? 'rgba(255, 0, 127, 0.04)' : 'transparent'; 
                  }}
                >
                  {/* Status Indicator */}
                  <td style={{ padding: '8px 12px' }}>
                    {isLoadedA ? (
                      <span style={{ color: 'var(--deck-a-primary)', fontWeight: 800, fontSize: '10px' }}>ON DECK A</span>
                    ) : isLoadedB ? (
                      <span style={{ color: 'var(--deck-b-primary)', fontWeight: 800, fontSize: '10px' }}>ON DECK B</span>
                    ) : (
                      <span style={{ color: 'var(--ai-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                        <CheckCircle2 size={12} /> READY
                      </span>
                    )}
                  </td>

                  {/* Title & Artist */}
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{trk.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{trk.artist}</div>
                  </td>

                  {/* BPM */}
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {trk.bpm !== null && trk.bpm !== undefined ? trk.bpm.toFixed(1) : <span style={{ color: '#ff3b5c' }}>N/A</span>}
                  </td>

                  {/* Key Badge */}
                  <td style={{ padding: '8px 12px' }}>
                    {trk.key && trk.key !== '--' ? (
                      <span className={`key-badge key-${parseInt(trk.key) || 1}`}>
                        {trk.key} ({trk.musicalKeyName})
                      </span>
                    ) : (
                      <span style={{ color: '#ff3b5c', fontSize: '10px' }}>N/A</span>
                    )}
                  </td>

                  {/* Energy Meter */}
                  <td style={{ padding: '8px 12px' }}>
                    {trk.energy !== null && trk.energy !== undefined ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ 
                          width: '48px', 
                          height: '6px', 
                          background: '#1a2230', 
                          borderRadius: '3px', 
                          overflow: 'hidden' 
                        }}>
                          <div style={{ 
                            width: `${(trk.energy || 0) * 100}%`, 
                            height: '100%', 
                            background: (trk.energy || 0) > 0.85 ? '#ff1744' : (trk.energy || 0) > 0.65 ? 'var(--ai-primary)' : 'var(--deck-a-primary)' 
                          }} />
                        </div>
                        <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {Math.round((trk.energy || 0) * 100)}%
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: '#ff3b5c', fontSize: '10px' }}>N/A</span>
                    )}
                  </td>

                  {/* Genre */}
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                    {trk.genre}
                  </td>

                  {/* Duration */}
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '11px' }}>
                    {formatDuration(trk.duration)}
                  </td>

                  {/* Action buttons */}
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => onLoadDeckA(trk)}
                        className="dj-btn"
                        style={{
                          background: 'rgba(0, 229, 255, 0.15)',
                          color: 'var(--deck-a-primary)',
                          border: '1px solid var(--deck-a-primary)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 800
                        }}
                      >
                        LOAD A
                      </button>
                      <button
                        onClick={() => onLoadDeckB(trk)}
                        className="dj-btn"
                        style={{
                          background: 'rgba(255, 0, 127, 0.15)',
                          color: 'var(--deck-b-primary)',
                          border: '1px solid var(--deck-b-primary)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 800
                        }}
                      >
                        LOAD B
                      </button>
                      {onReanalyzeTrack && (
                        <button
                          onClick={() => onReanalyzeTrack(trk)}
                          className="dj-btn"
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#e2e8f0',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700
                          }}
                          title="Reanalyze track"
                        >
                          REANALYZE
                        </button>
                      )}
                      <button
                        onClick={() => onSelectNextAI(trk)}
                        className="dj-btn"
                        style={{
                          background: 'rgba(0, 255, 136, 0.15)',
                          color: 'var(--ai-primary)',
                          border: '1px solid var(--ai-primary)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 800
                        }}
                        title="Force AI to queue this track as next transition"
                      >
                        AI NEXT
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
