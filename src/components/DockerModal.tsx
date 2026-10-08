import React, { useState } from 'react';
import { Copy, Check, Terminal, Server, ShieldCheck, X, HardDrive } from 'lucide-react';

interface DockerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DockerModal: React.FC<DockerModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const dockerComposeSnippet = `# docker-compose.yml
services:
  musicmix:
    build: .
    image: musicmix:latest
    container_name: musicmix-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - ./data:/app/data`;

  const dockerRunSnippet = `# Single command Docker run with persistent volume:
docker run -d \\
  --name musicmix-app \\
  --restart unless-stopped \\
  -p 3000:3000 \\
  -v $(pwd)/data:/app/data \\
  musicmix:latest`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Docker Linux Server Deployment Guide</h3>
              <p className="text-xs text-zinc-400">Deploy MusicMix and connect multiple computers on your network</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-zinc-300">
          {/* Multi-computer access highlight */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 to-violet-950/40 border border-cyan-500/20 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-medium text-cyan-200 text-xs uppercase tracking-wider">Multi-Computer Real-Time Sync</div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                When hosted on your Linux server, any computer on your local network or domain can open{' '}
                <code className="text-cyan-300 font-mono bg-black/40 px-1 py-0.5 rounded">http://&lt;SERVER-IP&gt;:3000</code>.
                All updates, searched songs, and playlist likes sync in real-time across all connected computers via WebSocket!
              </p>
            </div>
          </div>

          {/* Step 1: Docker Compose */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">1</span>
                Quick Launch with Docker Compose (Recommended)
              </div>
              <button
                onClick={() => copyText('docker compose up -d --build', 1)}
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition"
              >
                {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedIndex === 1 ? 'Copied' : 'Copy command'}</span>
              </button>
            </div>
            <div className="relative font-mono text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-200">
              <code>docker compose up -d --build</code>
            </div>
            <div className="relative font-mono text-xs bg-zinc-900/70 border border-zinc-800/80 rounded-lg p-3 text-zinc-400 overflow-x-auto">
              <pre>{dockerComposeSnippet}</pre>
            </div>
          </div>

          {/* Step 2: Persistent Storage */}
          <div className="space-y-2">
            <div className="font-semibold text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-violet-400" />
              Persistent Central Playlist & Database
            </div>
            <p className="text-xs text-zinc-400">
              The database is stored in <code className="text-zinc-200 bg-black/40 px-1 py-0.5 rounded">./data/musicmix_db.json</code>.
              Because the Docker compose file mounts <code className="text-zinc-200 bg-black/40 px-1 py-0.5 rounded">./data:/app/data</code>,
              all searched songs and central playlist items survive server restarts and container upgrades.
            </p>
          </div>

          {/* Step 3: Standalone Docker CLI */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-zinc-400" />
                Alternative: Standard Docker CLI
              </div>
              <button
                onClick={() => copyText(dockerRunSnippet, 2)}
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition"
              >
                {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedIndex === 2 ? 'Copied' : 'Copy command'}</span>
              </button>
            </div>
            <div className="relative font-mono text-xs bg-zinc-900/70 border border-zinc-800 rounded-lg p-3 text-zinc-400 overflow-x-auto">
              <pre>{dockerRunSnippet}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-zinc-800 bg-zinc-900/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
