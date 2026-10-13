import React, { useState, useEffect } from 'react';
import { usePWAInstall, PWAInstallState } from '../hooks/usePWAInstall';
import { Smartphone, CheckCircle, XCircle, RefreshCw, Trash2, ArrowLeft, ShieldCheck, Download } from 'lucide-react';

interface PWADebugViewProps {
  onBackToApp: () => void;
  installState?: PWAInstallState;
}

export const PWADebugView: React.FC<PWADebugViewProps> = ({ onBackToApp, installState: externalState }) => {
  const hookState = usePWAInstall();
  const state = externalState || hookState;
  const {
    canInstall,
    isInstalled,
    isStandalone,
    isIOS,
    isAndroid,
    isInAppBrowser,
    browserName,
    installApp,
    resetDismissed,
  } = state;

  const [swStatus, setSwStatus] = useState<string>('Vérification...');
  const [swScope, setSwScope] = useState<string>('');
  const [manifestStatus, setManifestStatus] = useState<string>('Vérification...');
  const [manifestData, setManifestData] = useState<any>(null);
  const [displayMode, setDisplayMode] = useState<string>('browser');
  const [userAgent, setUserAgent] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    setUserAgent(navigator.userAgent);

    // Detect actual CSS display-mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setDisplayMode('standalone');
    } else if (window.matchMedia('(display-mode: minimal-ui)').matches) {
      setDisplayMode('minimal-ui');
    } else if (window.matchMedia('(display-mode: fullscreen)').matches) {
      setDisplayMode('fullscreen');
    } else {
      setDisplayMode('browser');
    }

    // Check Service Worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          setSwStatus(`Actif (${reg.active ? 'running' : 'waiting'})`);
          setSwScope(reg.scope);
          addLog(`Service Worker trouvé avec scope: ${reg.scope}`);
        } else {
          setSwStatus('Non enregistré');
          addLog('Aucun Service Worker actif trouvé');
        }
      }).catch((err) => {
        setSwStatus(`Erreur: ${err.message}`);
      });
    } else {
      setSwStatus('Non supporté par ce navigateur');
    }

    // Fetch and validate manifest.json
    fetch('/manifest.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setManifestStatus('Valide (200 OK)');
        setManifestData(data);
        addLog(`Manifest chargé: "${data.name}" (${data.lang})`);
      })
      .catch((err) => {
        setManifestStatus(`Erreur: ${err.message}`);
        addLog(`Erreur chargement manifest: ${err.message}`);
      });
  }, []);

  const handleTestInstall = async () => {
    addLog('Déclenchement test installApp()...');
    const res = await installApp();
    addLog(`Résultat installApp(): ${res}`);
    setActionNotice(`Résultat prompt: ${res}`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleClearPwaStorage = () => {
    resetDismissed();
    localStorage.removeItem('windz_install_prompt_dismissed');
    sessionStorage.removeItem('windz_pwa_dismissed_at');
    addLog('Stockage PWA réinitialisé (cooldown levé)');
    setActionNotice('Cooldown de prompt réinitialisé !');
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleUnregisterSW = async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
      setSwStatus('Désenregistré (recharger la page)');
      addLog('Tous les Service Workers ont été désenregistrés');
      setActionNotice('Service Worker purgé. Rechargez pour réinstaller.');
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1214] text-slate-100 p-4 sm:p-8 font-sans selection:bg-[#D4A34A]/30">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4A34A]/10 border border-[#D4A34A]/40 flex items-center justify-center text-[#D4A34A]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-black text-white flex items-center gap-2">
                <span>WinDZ PWA Diagnostics</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  v4.0
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Outil de diagnostic pour vérifier l'éligibilité au prompt natif d'installation
              </p>
            </div>
          </div>

          <button
            onClick={onBackToApp}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition cursor-pointer border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'App</span>
          </button>
        </div>

        {actionNotice && (
          <div className="p-3 rounded-xl bg-[#D4A34A]/20 border border-[#D4A34A]/40 text-[#F3E5AB] text-xs font-semibold animate-in fade-in">
            {actionNotice}
          </div>
        )}

        {/* Diagnostic Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Installation State */}
          <div className="bg-[#0F1B1E] border border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-lg">
            <h2 className="text-sm font-bold text-[#F3E5AB] flex items-center gap-2 border-b border-slate-800 pb-2">
              <ShieldCheck className="w-4 h-4 text-[#D4A34A]" />
              <span>Statut d'Installation & Prompt</span>
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Can Install (beforeinstallprompt prêt) :</span>
                <span className="flex items-center gap-1 font-mono font-bold">
                  {canInstall ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> OUI (Prêt pour 1-clic)
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> NON (Attente événement ou déjà installé)
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Is Installed :</span>
                <span className={`font-mono font-bold ${isInstalled ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {isInstalled ? 'OUI' : 'NON'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Is Standalone (PWA ouverte plein écran) :</span>
                <span className={`font-mono font-bold ${isStandalone ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {isStandalone ? 'OUI (Mode Autonome)' : 'NON (Dans le navigateur)'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Display Mode actuel :</span>
                <span className="font-mono text-[#D4A34A] font-bold">{displayMode}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Action d'installation native :</span>
                <button
                  onClick={handleTestInstall}
                  disabled={!canInstall}
                  className="px-2.5 py-1 rounded-lg bg-[#D4A34A] text-slate-950 font-bold text-xs disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Tester prompt</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Device & Browser Profile */}
          <div className="bg-[#0F1B1E] border border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-lg">
            <h2 className="text-sm font-bold text-[#F3E5AB] flex items-center gap-2 border-b border-slate-800 pb-2">
              <Smartphone className="w-4 h-4 text-[#D4A34A]" />
              <span>Profil Appareil & Navigateur</span>
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Navigateur détecté :</span>
                <span className="font-mono text-white font-bold">{browserName}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Est Android :</span>
                <span className={`font-mono font-bold ${isAndroid ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {isAndroid ? 'OUI' : 'NON'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Est iOS (iPhone / iPad) :</span>
                <span className={`font-mono font-bold ${isIOS ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {isIOS ? 'OUI' : 'NON'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">In-App Browser (FB / Insta / WhatsApp) :</span>
                <span className={`font-mono font-bold ${isInAppBrowser ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isInAppBrowser ? 'OUI (Navigateur intégré détecté)' : 'NON (Navigateur standard)'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">URL Courante :</span>
                <span className="font-mono text-slate-300 text-[11px] truncate max-w-[200px]" title={typeof window !== 'undefined' ? window.location.href : ''}>
                  {typeof window !== 'undefined' ? window.location.pathname : '/'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Service Worker Status */}
          <div className="bg-[#0F1B1E] border border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-lg">
            <h2 className="text-sm font-bold text-[#F3E5AB] flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#D4A34A]" />
                <span>Service Worker</span>
              </span>
              <button
                onClick={handleUnregisterSW}
                className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                title="Purger le Service Worker"
              >
                <Trash2 className="w-3 h-3" />
                <span>Purger</span>
              </button>
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Statut :</span>
                <span className="font-mono text-white">{swStatus}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Scope :</span>
                <span className="font-mono text-slate-300">{swScope || '/'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Fichier SW :</span>
                <a href="/sw.js" target="_blank" rel="noreferrer" className="text-[#D4A34A] underline font-mono">
                  /sw.js
                </a>
              </div>
            </div>
          </div>

          {/* Card 4: Web App Manifest */}
          <div className="bg-[#0F1B1E] border border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-lg">
            <h2 className="text-sm font-bold text-[#F3E5AB] flex items-center gap-2 border-b border-slate-800 pb-2">
              <CheckCircle className="w-4 h-4 text-[#D4A34A]" />
              <span>Web App Manifest</span>
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Statut du fichier :</span>
                <span className="font-mono text-emerald-400">{manifestStatus}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Nom dans le manifest :</span>
                <span className="font-mono text-white">{manifestData?.name || 'WinDZ'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Lang & Dir :</span>
                <span className="font-mono text-slate-300">{manifestData?.lang || 'ar-DZ'} / {manifestData?.dir || 'rtl'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Fichier Manifest :</span>
                <a href="/manifest.json" target="_blank" rel="noreferrer" className="text-[#D4A34A] underline font-mono">
                  /manifest.json
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* User Agent & Actions */}
        <div className="bg-[#0F1B1E] border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold">User Agent brut :</span>
            <button
              onClick={handleClearPwaStorage}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#F3E5AB] font-semibold text-xs border border-slate-700 cursor-pointer"
            >
              Réinitialiser le cooldown du prompt
            </button>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-slate-800 font-mono text-slate-300 text-[11px] break-all">
            {userAgent || 'Non disponible'}
          </div>
        </div>

        {/* Live Logs */}
        <div className="bg-[#0F1B1E] border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg text-xs">
          <span className="text-slate-400 font-semibold">Logs récents de la session :</span>
          <div className="p-3 rounded-xl bg-black/40 border border-slate-800 font-mono text-slate-300 text-[11px] space-y-1 max-h-48 overflow-y-auto">
            {logs.length === 0 ? (
              <span className="text-slate-500">Aucun log enregistré</span>
            ) : (
              logs.map((log, index) => <div key={index}>{log}</div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
