import React, { useEffect, useState } from 'react';
import { ShoppingBag, X, ExternalLink, Volume2, CheckCircle2, Sparkles } from 'lucide-react';
import { LandingPageOrder, PublicLandingPage } from '../types';
import { playOrderNotificationSound } from '../lib/notificationSound';

export interface LiveOrderNotification {
  id: string;
  order: LandingPageOrder;
  page?: PublicLandingPage;
  customerName: string;
  productName: string;
  totalDZD: number;
  wilaya?: string;
  receivedAt: Date;
}

interface LiveOrderToastProps {
  notification: LiveOrderNotification | null;
  onDismiss: () => void;
  onViewOrder: (pageIdOrSlug: string, orderId: string) => void;
  isAr: boolean;
}

export const LiveOrderToast: React.FC<LiveOrderToastProps> = ({
  notification,
  onDismiss,
  onViewOrder,
  isAr,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 8000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [notification, onDismiss]);

  if (!notification || !visible) return null;

  const { order, page, customerName, productName, totalDZD, wilaya } = notification;

  return (
    <div
      id="live-order-toast"
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100vw-24px)] max-w-xl sm:w-auto sm:min-w-[440px] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
    >
      <div className="relative overflow-hidden rounded-2xl bg-[#0C171A] border-2 border-emerald-500/60 shadow-[0_12px_40px_rgba(16,185,129,0.28)] p-4 text-white backdrop-blur-xl">
        {/* Glowing top ambient line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-[#D4A34A] to-emerald-400"></div>

        <div className="flex items-start gap-3.5">
          {/* Animated pulsing icon badge */}
          <div className="relative shrink-0 mt-0.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 animate-bounce" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          {/* Body Content */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isAr ? 'طلب جديد مباشر !' : 'Nouvelle commande en direct !'}
                </span>
                <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded font-mono">
                  {isAr ? 'الآن' : 'À l\'instant'}
                </span>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={() => {
                  setVisible(false);
                  setTimeout(onDismiss, 200);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                title={isAr ? 'إغلاق' : 'Fermer'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer & Product details */}
            <div className="mt-1.5 space-y-1 text-xs">
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-slate-400">{isAr ? 'الزبون :' : 'Client :'}</span>
                <strong className="font-semibold text-white truncate max-w-[200px]">
                  {customerName || (isAr ? 'زبون' : 'Client')}
                </strong>
                {wilaya && (
                  <span className="text-slate-400 text-[11px]">
                    ({wilaya})
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-slate-400">{isAr ? 'المنتج :' : 'Produit :'}</span>
                <span className="text-[#D4A34A] font-medium truncate max-w-[260px]">
                  {productName}
                </span>
              </div>

              {totalDZD > 0 && (
                <div className="flex items-baseline gap-1.5 pt-0.5">
                  <span className="text-slate-400">{isAr ? 'المجموع :' : 'Total :'}</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">
                    <bdi dir="ltr">{totalDZD.toLocaleString()}</bdi> {isAr ? 'دج' : 'DZD'}
                  </span>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-emerald-500/20">
              <button
                onClick={() => playOrderNotificationSound()}
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title={isAr ? 'إعادة تشغيل الصوت' : 'Rejouer le son'}
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">{isAr ? 'صوت التنبيه' : 'Son'}</span>
              </button>

              <button
                onClick={() => {
                  const target = page?.id || page?.slug || order.landingPageId || '';
                  onViewOrder(target, order.id);
                  setVisible(false);
                  setTimeout(onDismiss, 200);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer active:scale-95"
              >
                <span>{isAr ? 'عرض تفاصيل الطلب' : 'Voir la commande'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
