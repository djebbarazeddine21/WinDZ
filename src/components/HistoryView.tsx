import React, { useState, useEffect } from 'react';
import { Trash2, FileText, Download, ArrowLeft, ExternalLink, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { ProductAnalysis, User } from '../types';
import { api } from '../lib/api';
import { translations, Language } from '../lib/i18n';

interface HistoryViewProps {
  user: User | null;
  lang: Language;
  onSelectAnalysis: (analysis: ProductAnalysis) => void;
  onBackToAnalyze: () => void;
  onRequestUpgrade: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  user,
  lang,
  onSelectAnalysis,
  onBackToAnalyze,
  onRequestUpgrade,
}) => {
  const t = translations[lang];
  const [analyses, setAnalyses] = useState<ProductAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPro = user?.subscriptionTier === 'pro';

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await api.products.list();
      setAnalyses(data.analyses || []);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de l\'historique');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t.deleteConfirm)) return;

    try {
      await api.products.delete(id);
      setAnalyses((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  };

  // Export to PDF
  const exportPDF = () => {
    if (!isPro) {
      onRequestUpgrade();
      return;
    }

    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('WinDZ - Rapport Historique des Analyses', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Utilisateur: ${user?.email || 'N/A'} | Date: ${new Date().toLocaleDateString('fr-FR')}`, 14, 28);
    doc.text('Analyses IA - Marche E-commerce Algerie', 14, 34);

    let y = 46;
    analyses.forEach((item, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${index + 1}. ${item.productName} (${item.category})`, 14, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Score: ${item.score}/100 | Demande: ${item.demandeEstimee} | Concurrence: ${item.niveauConcurrence}`, 14, y + 5);
      doc.text(`Prix envisage: ${item.targetPriceDZD} DZD | Prix conseille: ${item.prixMin}-${item.prixMax} DZD`, 14, y + 10);
      
      const adviceLines = doc.splitTextToSize(`Conseil: ${item.conseil}`, 180);
      doc.text(adviceLines, 14, y + 15);

      y += 18 + adviceLines.length * 4;
    });

    doc.save(`windz-analyses-${Date.now()}.pdf`);
  };

  // Export to CSV/Excel
  const exportCSV = () => {
    if (!isPro) {
      onRequestUpgrade();
      return;
    }

    const headers = ['Nom du produit', 'Categorie', 'Prix envisage (DZD)', 'Score', 'Verdict', 'Demande', 'Concurrence', 'Prix Min (DZD)', 'Prix Max (DZD)', 'Date'];
    const rows = analyses.map((a) => [
      `"${a.productName.replace(/"/g, '""')}"`,
      `"${a.category}"`,
      a.targetPriceDZD,
      a.score,
      a.verdict,
      a.demandeEstimee,
      a.niveauConcurrence,
      a.prixMin,
      a.prixMax,
      new Date(a.createdAt).toLocaleDateString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `windz-analyses-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#152428] border border-[#233A3E] p-4 rounded-2xl shadow-md">
        <div>
          <button
            onClick={onBackToAnalyze}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.analyze}</span>
          </button>
          <h2 className="text-lg sm:text-xl font-bold font-serif text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#D4A34A]" />
            {t.historyTitle}
          </h2>
          <p className="text-xs text-slate-400">
            {isPro ? t.unlimitedPro : t.limitNoticeBasic}
          </p>
        </div>

        {/* Export actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportPDF}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              isPro
                ? 'bg-[#2A9D8F]/15 border-[#2A9D8F]/40 text-[#48CFAD] hover:bg-[#2A9D8F]/30'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-300'
            }`}
            title={isPro ? t.exportPdf : 'Fonctionnalité réservée au plan Pro'}
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
            {!isPro && <span className="text-[9px] text-[#D4A34A] font-bold ml-1">PRO</span>}
          </button>

          <button
            onClick={exportCSV}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              isPro
                ? 'bg-[#D4A34A]/15 border-[#D4A34A]/40 text-[#F3E5AB] hover:bg-[#D4A34A]/30'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-300'
            }`}
            title={isPro ? t.exportExcel : 'Fonctionnalité réservée au plan Pro'}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel/CSV</span>
            {!isPro && <span className="text-[9px] text-[#D4A34A] font-bold ml-1">PRO</span>}
          </button>
        </div>
      </div>

      {/* Upgrading banner if not Pro */}
      {!isPro && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-[#D4A34A]/15 to-[#2A9D8F]/15 border border-[#D4A34A]/30 text-xs">
          <span className="text-slate-200">
            {lang === 'ar'
              ? 'الباقة الأساسية تعرض آخر 15 تحليلاً فقط. قم بالترقية لفتح سجل غير محدود والتصدير.'
              : 'Passez au forfait Pro pour débloquer l\'historique illimité et l\'export Excel/PDF.'}
          </span>
          <button
            onClick={onRequestUpgrade}
            className="px-2.5 py-1 rounded-lg bg-[#D4A34A] hover:bg-[#E5B55E] text-slate-950 font-bold text-[11px] shrink-0 ml-2 cursor-pointer"
          >
            {lang === 'ar' ? 'ترقية' : 'Passer Pro'}
          </button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          Chargement de votre historique...
        </div>
      ) : analyses.length === 0 ? (
        <div className="bg-[#152428] border border-[#233A3E] rounded-2xl p-8 text-center">
          <Sparkles className="w-8 h-8 text-[#D4A34A] mx-auto mb-2 opacity-60" />
          <p className="text-sm text-slate-300 mb-3">{t.noHistoryYet}</p>
          <button
            onClick={onBackToAnalyze}
            className="px-4 py-2 rounded-xl bg-[#2A9D8F] text-white text-xs font-bold hover:bg-[#238276] transition cursor-pointer"
          >
            {t.analyzeFirstProduct}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {analyses.map((item) => {
            const scoreColor =
              item.score >= 71 ? 'text-emerald-400' : item.score >= 45 ? 'text-amber-400' : 'text-red-400';
            const scoreBadgeBg =
              item.score >= 71
                ? 'bg-emerald-500/15 border-emerald-500/30'
                : item.score >= 45
                ? 'bg-amber-500/15 border-amber-500/30'
                : 'bg-red-500/15 border-red-500/30';

            return (
              <div
                key={item.id}
                onClick={() => onSelectAnalysis(item)}
                className="bg-[#152428] border border-[#233A3E] hover:border-[#2A9D8F]/50 p-3 sm:p-4 rounded-xl flex items-center justify-between gap-3 transition cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.photoUrl ? (
                    <img
                      src={item.photoUrl}
                      alt={item.productName}
                      className="w-12 h-12 rounded-lg object-cover bg-[#0F1B1E] shrink-0 border border-[#233A3E]"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[#0F1B1E] border border-[#233A3E] flex items-center justify-center text-xs font-bold text-[#D4A34A] shrink-0">
                      DZ
                    </div>
                  )}

                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate group-hover:text-[#48CFAD] transition">
                      {item.productName}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{item.category}</span>
                      <span>•</span>
                      <span>{new Date(item.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-FR')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Score badge */}
                  <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold font-serif ${scoreBadgeBg} ${scoreColor}`}>
                    {item.score} / 100
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                    title={t.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
