import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  HardDrive,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Loader2,
  Trash2
} from 'lucide-react';
import { DatabaseBackupMeta, Song } from '../types/music';

interface DatabasePageProps {
  playlist: Song[];
  databaseSongs: Song[];
  onDatabaseRestored: (newPlaylist: Song[]) => void;
}

export const DatabasePage: React.FC<DatabasePageProps> = ({
  playlist,
  databaseSongs,
  onDatabaseRestored
}) => {
  const [backups, setBackups] = useState<DatabaseBackupMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<{ playlistCount: number; searchedSongsCount: number; data: any } | null>(null);

  // Fetch the last 5 backups
  const loadBackups = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/database/exports');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.backups)) {
          setBackups(data.backups);
        }
      }
    } catch (err) {
      console.error('Failed to load stored backups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Export database: triggers download and stores in last 5 on website
  const handleExportDatabase = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/database/export', { method: 'POST' });
      if (!res.ok) throw new Error('Export request failed');
      const data = await res.json();

      // Trigger instant browser download of the json file
      const jsonStr = JSON.stringify(data.data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename || `musicmix_backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (data.backups) {
        setBackups(data.backups);
      } else {
        loadBackups();
      }

      showStatus(`Database exported successfully! Downloaded: ${data.filename}`, 'success');
    } catch (err) {
      console.error('Export error:', err);
      showStatus('Failed to export database snapshot', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Restore from one of the stored server snapshots
  const handleRestoreFromStoredBackup = async (backup: DatabaseBackupMeta) => {
    if (!window.confirm(`Are you sure you want to restore the snapshot "${backup.filename}"? Current data will be replaced.`)) {
      return;
    }

    setIsRestoring(true);
    try {
      const res = await fetch('/api/database/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: backup.filename })
      });
      if (!res.ok) throw new Error('Restore request failed');
      const data = await res.json();

      if (data.playlist) {
        onDatabaseRestored(data.playlist);
      }
      showStatus(`Database restored from "${backup.filename}"! (${data.playlistCount} tracks)`, 'success');
    } catch (err) {
      console.error('Restore error:', err);
      showStatus('Failed to restore from snapshot', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Handle uploaded JSON file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.playlist)) {
          setUploadPreview({
            playlistCount: parsed.playlist.length,
            searchedSongsCount: Array.isArray(parsed.searchedSongs) ? parsed.searchedSongs.length : 0,
            data: parsed
          });
        } else {
          showStatus('Selected file does not appear to be a valid MusicMix backup', 'error');
          setSelectedFile(null);
          setUploadPreview(null);
        }
      } catch (err) {
        showStatus('Invalid JSON file format', 'error');
        setSelectedFile(null);
        setUploadPreview(null);
      }
    };
    reader.readAsText(file);
  };

  // Restore from uploaded JSON file
  const handleRestoreFromUpload = async () => {
    if (!uploadPreview) return;
    if (!window.confirm(`Restore database from uploaded file? This will replace current tracks with ${uploadPreview.playlistCount} playlist songs.`)) {
      return;
    }

    setIsRestoring(true);
    try {
      const res = await fetch('/api/database/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupData: uploadPreview.data })
      });
      if (!res.ok) throw new Error('Upload restore failed');
      const data = await res.json();

      if (data.playlist) {
        onDatabaseRestored(data.playlist);
      }
      setSelectedFile(null);
      setUploadPreview(null);
      showStatus(`Database successfully restored from file! (${data.playlistCount} playlist songs)`, 'success');
      loadBackups();
    } catch (err) {
      console.error('Restore error:', err);
      showStatus('Failed to restore from uploaded backup file', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 ${
            statusMessage.type === 'success'
              ? 'bg-zinc-900 border-emerald-500/40 text-emerald-300'
              : 'bg-zinc-900 border-rose-500/40 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span className="text-xs font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 p-6 md:p-8 shadow-xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono">
            <HardDrive className="w-4 h-4" />
            <span>DATABASE MANAGEMENT & BACKUP VAULT (PAGE 4)</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Database Export, Backups & Restoration
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Export and download your complete MusicMix database snapshot with one click. The server automatically preserves the last 5 database exports for instant on-demand retrieval and one-click rollback. You can also restore any saved backup or upload a previous JSON backup file.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <div className="text-[11px] font-mono text-zinc-500">CENTRAL PLAYLIST</div>
              <div className="text-lg font-bold text-violet-300">{playlist.length} Tracks</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <div className="text-[11px] font-mono text-zinc-500">SEARCH ARCHIVE CACHE</div>
              <div className="text-lg font-bold text-cyan-300">{databaseSongs.length} Songs</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <div className="text-[11px] font-mono text-zinc-500">STORED BACKUP SNAPSHOTS</div>
              <div className="text-lg font-bold text-emerald-300">{backups.length} / 5 Slots</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Export Action on Left, File Upload Restore on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Card: 1-Click Export */}
        <div className="lg:col-span-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 shadow-xl backdrop-blur-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Export Database</h3>
                <p className="text-xs text-zinc-400">Download snapshot and store in the last 5 backup history</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Clicking the button below generates a timestamped snapshot of all central playlist songs, searched song metadata, BPM, keys, and audio parameters. The file will automatically download to your computer, and the last 5 exports are saved in the server's storage.
            </p>
          </div>

          <button
            onClick={handleExportDatabase}
            disabled={isExporting}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-zinc-950" /> : <Download className="w-4 h-4 text-zinc-950" />}
            <span>{isExporting ? 'Generating Snapshot...' : 'Export & Download Database Now'}</span>
          </button>
        </div>

        {/* Right Card: Upload File Restore */}
        <div className="lg:col-span-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 shadow-xl backdrop-blur-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Restore from Backup File</h3>
                <p className="text-xs text-zinc-400">Upload a saved .json database export to restore</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Have an exported MusicMix JSON backup file? Select it below to validate and restore the entire database. Connected computers will automatically sync to the restored playlist.
            </p>

            <div className="pt-1">
              <label className="block w-full cursor-pointer">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="border border-dashed border-zinc-700 hover:border-violet-500 rounded-xl p-4 text-center transition bg-zinc-950/40">
                  <FileText className="w-6 h-6 text-zinc-500 mx-auto mb-1" />
                  <span className="text-xs text-zinc-300 font-medium">
                    {selectedFile ? selectedFile.name : 'Click to select JSON backup file'}
                  </span>
                  <div className="text-[10px] text-zinc-500 mt-0.5">musicmix_backup_*.json</div>
                </div>
              </label>
            </div>

            {uploadPreview && (
              <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-500/30 text-xs text-violet-200 flex items-center justify-between">
                <span>
                  Valid Backup: <strong>{uploadPreview.playlistCount}</strong> playlist tracks,{' '}
                  <strong>{uploadPreview.searchedSongsCount}</strong> searched songs
                </span>
                <span className="text-emerald-400 font-mono text-[10px]">VERIFIED</span>
              </div>
            )}
          </div>

          <button
            onClick={handleRestoreFromUpload}
            disabled={!uploadPreview || isRestoring}
            className="w-full py-3.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 cursor-pointer"
          >
            {isRestoring ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <RotateCcw className="w-4 h-4" />}
            <span>{isRestoring ? 'Restoring Database...' : 'Restore from Uploaded File'}</span>
          </button>
        </div>
      </div>

      {/* Bottom Section: Last 5 Database Exports Stored on Website */}
      <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Last 5 Database Exports Stored on Server</span>
            </h3>
            <p className="text-xs text-zinc-400">
              The server maintains your 5 most recent database snapshots for instant download or 1-click restoration.
            </p>
          </div>
          <button
            onClick={loadBackups}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-mono transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh List</span>
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center items-center text-zinc-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading backup catalog...
          </div>
        ) : backups.length === 0 ? (
          <div className="py-10 text-center text-xs text-zinc-500 space-y-2">
            <HardDrive className="w-8 h-8 text-zinc-700 mx-auto" />
            <p>No exports saved on the server yet.</p>
            <p className="text-[11px] text-zinc-600">Click &quot;Export & Download Database Now&quot; above to create your first snapshot.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80 overflow-hidden">
            {backups.map((backup, idx) => (
              <div
                key={backup.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-zinc-800/20 px-2 rounded-xl transition"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center font-mono text-xs text-cyan-400 shrink-0 mt-0.5">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white font-mono flex items-center gap-2">
                      <span>{backup.filename}</span>
                    </div>
                    <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-2 mt-0.5">
                      <span>{backup.formattedDate}</span>
                      <span>•</span>
                      <span>{Math.round(backup.sizeBytes / 1024)} KB</span>
                      <span>•</span>
                      <span className="text-violet-300">{backup.playlistCount} Playlist Tracks</span>
                      <span>•</span>
                      <span className="text-cyan-300">{backup.searchedSongsCount} Archive Songs</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 sm:pt-0">
                  {/* Download button */}
                  <a
                    href={backup.downloadUrl}
                    download={backup.filename}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Download</span>
                  </a>

                  {/* One-click Restore button */}
                  <button
                    onClick={() => handleRestoreFromStoredBackup(backup)}
                    disabled={isRestoring}
                    className="px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 hover:text-white border border-violet-500/40 text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-violet-400" />
                    <span>Restore Snapshot</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
