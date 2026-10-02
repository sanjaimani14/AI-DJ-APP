/**
 * frontend/src/components/BottomSection.tsx
 * Phase 3 Music Library Display:
 * Explicitly displays for each track:
 * BPM | KEY | ENERGY | DURATION
 * with individual and batch REANALYZE buttons.
 */

import React, { useState } from 'react';
import type { Track } from '../types/dj';
import { 
  FolderPlus, 
  Search, 
  ListMusic, 
  Plus, 
  ArrowUpDown,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Music
} from 'lucide-react';

interface BottomSectionProps {
  tracks: Track[];
  onLoadDeckA: (track: Track) => void;
  onLoadDeckB: (track: Track) => void;
  onImportMusic: () => void;
  onRemoveTrack: (trackId: string) => void;
  onReanalyzeTrack: (track: Track) => void;
  onReanalyzeAll: () => void;
  currentDeckATrackId?: string;
  currentDeckBTrackId?: string;
}

export const BottomSection: React.FC<BottomSectionProps> = ({
  tracks,
  onLoadDeckA,
  onLoadDeckB,
  onImportMusic,
  onRemoveTrack,
  onReanalyzeTrack,
  onReanalyzeAll,
  currentDeckATrackId,
  currentDeckBTrackId
}) => {
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('All Tracks');
  const [searchQuery, setSearchQuery] = useState('');
  const [playlists, setPlaylists] = useState<string[]>([
    'All Tracks',
    'Local Imports',
    'Mainstage EDM',
    'Club & Party',
    'Live Favorites'
  ]);

  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'bpm' | 'key' | 'energy' | 'duration'>('title');
  const [sortAsc, setSortAsc] = useState(true);

  const formatDuration = (secs: number | null | undefined) => {
    if (!secs || isNaN(secs) || secs <= 0) return 'N/A';
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  const handleAddPlaylist = () => {
    const name = prompt('Enter new playlist name:');
    if (name && name.trim()) {
      setPlaylists([...playlists, name.trim()]);
      setSelectedPlaylist(name.trim());
    }
  };

  const filteredTracks = tracks.filter((t) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      t.title.toLowerCase().includes(query) ||
      t.artist.toLowerCase().includes(query) ||
      t.filename.toLowerCase().includes(query) ||
      (t.key && t.key.toLowerCase().includes(query)) ||
      (t.musicalKeyName && t.musicalKeyName.toLowerCase().includes(query)) ||
      (t.bpm && t.bpm.toString().includes(query)) ||
      (t.genre && t.genre.toLowerCase().includes(query));

    const matchesPlaylist = 
      selectedPlaylist === 'All Tracks' ||
      (selectedPlaylist === 'Local Imports' && (t.fileLocation.includes('Local') || t.fileLocation.includes('imported'))) ||
      (selectedPlaylist === 'Mainstage EDM' && (t.genre.includes('EDM') || (t.bpm && t.bpm >= 126 && t.bpm <= 132))) ||
      (selectedPlaylist === 'Club & Party' && (t.genre.includes('Club') || (t.energy && t.energy >= 0.7))) ||
      selectedPlaylist === 'Live Favorites';

    return matchesSearch && matchesPlaylist;
  }).sort((a, b) => {
    let comp = 0;
    if (sortBy === 'title') comp = a.title.localeCompare(b.title);
    else if (sortBy === 'artist') comp = a.artist.localeCompare(b.artist);
    else if (sortBy === 'bpm') comp = (a.bpm || 0) - (b.bpm || 0);
    else if (sortBy === 'key') comp = (a.key || '').localeCompare(b.key || '');
    else if (sortBy === 'energy') comp = (a.energy || 0) - (b.energy || 0);
    else if (sortBy === 'duration') comp = (a.duration || 0) - (b.duration || 0);
    return sortAsc ? comp : -comp;
  });

  return (
    <div 
      className="glass-panel" 
      style={{ 
        display: 'flex', 
        height: '280px', 
        overflow: 'hidden', 
        border: '1px solid var(--border-medium)',
        background: 'var(--bg-surface)'
      }}
    >
      {/* 1. PLAYLIST SIDEBAR */}
      <div style={{ 
        width: '180px', 
        borderRight: '1px solid var(--border-subtle)', 
        padding: '12px 10px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '6px',
        background: '#0a0d14'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ListMusic size={14} color="var(--deck-a-primary)" />
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              PLAYLISTS
            </span>
          </div>
          <button
            onClick={handleAddPlaylist}
            className="dj-btn"
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              padding: '2px',
              borderRadius: '3px'
            }}
            title="Create New Playlist"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Playlist list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', flex: 1 }}>
          {playlists.map((pl) => (
            <button
              key={pl}
              onClick={() => setSelectedPlaylist(pl)}
              className="dj-btn"
              style={{
                justifyContent: 'flex-start',
                padding: '5px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: selectedPlaylist === pl ? 700 : 500,
                background: selectedPlaylist === pl ? 'var(--bg-card-hover)' : 'transparent',
                color: selectedPlaylist === pl ? '#fff' : 'var(--text-secondary)',
                borderLeft: selectedPlaylist === pl ? '2px solid var(--deck-a-primary)' : '2px solid transparent',
                textTransform: 'none',
                letterSpacing: '0px'
              }}
            >
              {pl}
            </button>
          ))}
        </div>
      </div>

      {/* 2. MUSIC LIBRARY TABLE & CONTROLS */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '10px 14px' }}>
        {/* Search, Import, Reanalyze-All Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onImportMusic}
              className="dj-btn"
              style={{
                background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                color: 'var(--deck-a-primary)',
                border: '1px solid var(--border-medium)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                display: 'flex',
                gap: '6px',
                alignItems: 'center'
              }}
              title="Add or import audio files to analyze"
            >
              <FolderPlus size={14} /> IMPORT MUSIC
            </button>

            <button
              onClick={onReanalyzeAll}
              className="dj-btn"
              style={{
                background: 'rgba(0, 229, 255, 0.12)',
                color: 'var(--deck-a-primary)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                display: 'flex',
                gap: '6px',
                alignItems: 'center'
              }}
              title="Force re-analysis of all tracks in the library with Python engine"
            >
              <RefreshCw size={13} /> REANALYZE ALL
            </button>

            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {filteredTracks.length} tracks cached
            </span>
          </div>

          {/* Search bar */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            background: 'var(--bg-card)', 
            padding: '4px 8px', 
            borderRadius: '6px', 
            border: '1px solid var(--border-subtle)',
            width: '280px'
          }}>
            <Search size={13} color="var(--text-muted)" style={{ marginRight: '6px' }} />
            <input 
              type="text"
              placeholder="Search BPM, key, title, artist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '11px',
                outline: 'none',
                width: '100%'
              }}
            />
          </div>
        </div>

        {/* Music Library Table: Displays BPM | KEY | ENERGY | DURATION */}
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#0e121a', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-medium)', position: 'sticky', top: 0, zIndex: 2 }}>
                <th style={{ padding: '6px 10px' }}>STATUS</th>
                <th 
                  onClick={() => { setSortBy('title'); setSortAsc(!sortAsc); }}
                  style={{ padding: '6px 10px', cursor: 'pointer' }}
                >
                  TRACK / ARTIST <ArrowUpDown size={10} style={{ verticalAlign: 'middle' }} />
                </th>
                <th 
                  onClick={() => { setSortBy('bpm'); setSortAsc(!sortAsc); }}
                  style={{ padding: '6px 10px', cursor: 'pointer', color: 'var(--deck-a-primary)' }}
                >
                  BPM <ArrowUpDown size={10} style={{ verticalAlign: 'middle' }} />
                </th>
                <th 
                  onClick={() => { setSortBy('key'); setSortAsc(!sortAsc); }}
                  style={{ padding: '6px 10px', cursor: 'pointer', color: '#ffb703' }}
                >
                  KEY <ArrowUpDown size={10} style={{ verticalAlign: 'middle' }} />
                </th>
                <th 
                  onClick={() => { setSortBy('energy'); setSortAsc(!sortAsc); }}
                  style={{ padding: '6px 10px', cursor: 'pointer', color: 'var(--ai-primary)' }}
                >
                  ENERGY <ArrowUpDown size={10} style={{ verticalAlign: 'middle' }} />
                </th>
                <th 
                  onClick={() => { setSortBy('duration'); setSortAsc(!sortAsc); }}
                  style={{ padding: '6px 10px', cursor: 'pointer' }}
                >
                  DURATION <ArrowUpDown size={10} style={{ verticalAlign: 'middle' }} />
                </th>
                <th style={{ padding: '6px 10px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredTracks.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                      <Music size={32} style={{ opacity: 0.4, color: 'var(--deck-a-primary)' }} />
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {searchQuery ? `No tracks matching "${searchQuery}"` : 'No audio tracks in this playlist'}
                      </div>
                      <div style={{ fontSize: '11px', maxWidth: '360px', lineHeight: 1.4 }}>
                        Import your local MP3, WAV, FLAC, or AAC library to enable real-time DSP mixing and autonomous AI DJ transitions.
                      </div>
                      <button
                        onClick={onImportMusic}
                        className="dj-btn"
                        style={{
                          marginTop: '6px',
                          background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.15) 0%, rgba(0, 163, 255, 0.25) 100%)',
                          border: '1px solid var(--deck-a-primary)',
                          color: 'var(--deck-a-primary)',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        + IMPORT AUDIO FILES
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTracks.map((trk) => {
                  const isLoadedA = currentDeckATrackId === trk.id;
                const isLoadedB = currentDeckBTrackId === trk.id;
                const isFailed = trk.status === 'failed' || trk.status === 'unavailable';
                const isAnalyzing = trk.status === 'analyzing';

                return (
                  <tr 
                    key={trk.id}
                    style={{ 
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isLoadedA ? 'rgba(0, 229, 255, 0.05)' : isLoadedB ? 'rgba(255, 0, 127, 0.05)' : 'transparent',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                    onMouseLeave={(e) => { 
                      e.currentTarget.style.background = isLoadedA ? 'rgba(0, 229, 255, 0.05)' : isLoadedB ? 'rgba(255, 0, 127, 0.05)' : 'transparent'; 
                    }}
                  >
                    {/* Status Column */}
                    <td style={{ padding: '6px 10px' }}>
                      {isAnalyzing ? (
                        <span style={{ color: 'var(--deck-a-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '9px', fontWeight: 800 }}>
                          <RefreshCw size={10} className="spin-animation" /> ANALYZING
                        </span>
                      ) : isFailed ? (
                        <span style={{ color: '#ff3b5c', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '9px', fontWeight: 800 }} title={trk.errorMessage || 'Analysis Failed'}>
                          <AlertTriangle size={10} /> UNAVAILABLE
                        </span>
                      ) : isLoadedA ? (
                        <span style={{ color: 'var(--deck-a-primary)', fontWeight: 800, fontSize: '9px' }}>DECK A</span>
                      ) : isLoadedB ? (
                        <span style={{ color: 'var(--deck-b-primary)', fontWeight: 800, fontSize: '9px' }}>DECK B</span>
                      ) : (
                        <span style={{ color: 'var(--ai-primary)', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px' }}>
                          <CheckCircle2 size={10} /> READY
                        </span>
                      )}
                    </td>

                    {/* Track Title & Artist */}
                    <td style={{ padding: '6px 10px' }}>
                      <div style={{ fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Music size={12} color="var(--text-muted)" />
                        <span style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={trk.title}>
                          {trk.title}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '17px' }}>
                        {trk.artist || 'Unknown Artist'}
                      </div>
                    </td>

                    {/* 1. BPM */}
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>
                      {trk.bpm !== null && trk.bpm !== undefined ? (
                        <div>
                          <span style={{ fontWeight: 800, color: '#00e5ff', fontSize: '12px' }}>
                            {trk.bpm.toFixed(1)}
                          </span>
                          {trk.tempoConfidence && (
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: '4px' }} title={`Tempo Confidence: ${Math.round(trk.tempoConfidence * 100)}%`}>
                              ({Math.round(trk.tempoConfidence * 100)}%)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#ff3b5c', fontSize: '10px' }}>UNAVAILABLE</span>
                      )}
                    </td>

                    {/* 2. KEY (Camelot & Musical) */}
                    <td style={{ padding: '6px 10px' }}>
                      {trk.key && trk.key !== '--' ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <span 
                            style={{ 
                              background: 'rgba(255, 183, 3, 0.15)',
                              color: '#ffb703',
                              border: '1px solid rgba(255, 183, 3, 0.4)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 800,
                              fontSize: '10px'
                            }}
                          >
                            {trk.key}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                            {trk.musicalKeyName}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#ff3b5c', fontSize: '10px' }}>UNAVAILABLE</span>
                      )}
                    </td>

                    {/* 3. ENERGY (0.0 to 1.0) */}
                    <td style={{ padding: '6px 10px' }}>
                      {trk.energy !== null && trk.energy !== undefined ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ 
                            width: '42px', 
                            height: '6px', 
                            background: '#151b26', 
                            borderRadius: '3px', 
                            overflow: 'hidden' 
                          }}>
                            <div style={{ 
                              width: `${Math.round(trk.energy * 100)}%`, 
                              height: '100%', 
                              background: trk.energy > 0.8 ? '#ff1744' : trk.energy > 0.5 ? 'var(--ai-primary)' : 'var(--deck-a-primary)' 
                            }} />
                          </div>
                          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#fff', fontWeight: 700 }}>
                            {Math.round(trk.energy * 100)}%
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#ff3b5c', fontSize: '10px' }}>UNAVAILABLE</span>
                      )}
                    </td>

                    {/* 4. DURATION */}
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {formatDuration(trk.duration)}
                    </td>

                    {/* ACTIONS: LOAD A | LOAD B | REANALYZE | DELETE */}
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                        <button
                          onClick={() => onLoadDeckA(trk)}
                          disabled={isFailed}
                          className="dj-btn"
                          style={{
                            background: 'rgba(0, 229, 255, 0.15)',
                            color: 'var(--deck-a-primary)',
                            border: '1px solid var(--deck-a-primary)',
                            padding: '3px 6px',
                            borderRadius: '3px',
                            fontSize: '9px',
                            fontWeight: 800,
                            opacity: isFailed ? 0.4 : 1
                          }}
                          title="Load track to Left Deck A"
                        >
                          LOAD A
                        </button>

                        <button
                          onClick={() => onLoadDeckB(trk)}
                          disabled={isFailed}
                          className="dj-btn"
                          style={{
                            background: 'rgba(255, 0, 127, 0.15)',
                            color: 'var(--deck-b-primary)',
                            border: '1px solid var(--deck-b-primary)',
                            padding: '3px 6px',
                            borderRadius: '3px',
                            fontSize: '9px',
                            fontWeight: 800,
                            opacity: isFailed ? 0.4 : 1
                          }}
                          title="Load track to Right Deck B"
                        >
                          LOAD B
                        </button>

                        {/* REANALYZE BUTTON (Phase 3 Requirement) */}
                        <button
                          onClick={() => onReanalyzeTrack(trk)}
                          className="dj-btn"
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#e2e8f0',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            padding: '3px 7px',
                            borderRadius: '3px',
                            fontSize: '9px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title="Re-extract BPM, Key, Energy & Loudness fresh from audio file"
                        >
                          <RefreshCw size={9} /> REANALYZE
                        </button>

                        <button
                          onClick={() => onRemoveTrack(trk.id)}
                          className="dj-btn"
                          style={{
                            background: 'rgba(255, 51, 68, 0.1)',
                            color: '#ff5252',
                            border: '1px solid rgba(255, 51, 68, 0.3)',
                            padding: '3px 5px',
                            borderRadius: '3px'
                          }}
                          title="Remove track from library"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
