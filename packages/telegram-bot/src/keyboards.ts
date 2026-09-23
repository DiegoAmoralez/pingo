import { InlineKeyboard } from 'grammy';
import { CB, withId } from './callbacks.js';
import type { Dictionary } from './i18n.js';
import type { NotificationPreferenceKey } from '@pingo/core';

export function appUrl(path = ''): string {
  const base = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${base}${path}`;
}

export function mainMenuKeyboard(t: Dictionary): InlineKeyboard {
  return new InlineKeyboard()
    .text(t.menuSites, CB.sites)
    .text(t.menuAdd, CB.add)
    .row()
    .text(t.menuIncidents, CB.incidents)
    .text(t.menuNotifications, CB.notifications)
    .row()
    .text(t.menuPlan, CB.plan)
    .text(t.menuAccount, CB.account)
    .row()
    .text(t.menuLanguage, CB.language)
    .text(t.menuHelp, CB.help);
}

export function notLinkedKeyboard(t: Dictionary): InlineKeyboard {
  return new InlineKeyboard()
    .url(t.openApp, appUrl('/settings?tab=notifications'))
    .row()
    .text(t.menuLanguage, CB.language);
}

export function backKeyboard(t: Dictionary, target: string = CB.menu): InlineKeyboard {
  return new InlineKeyboard().text(t.back, target);
}

export type SiteButton = { id: string; label: string };

export function sitesKeyboard(t: Dictionary, sites: SiteButton[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const site of sites) {
    keyboard.text(site.label, withId(CB.site, site.id)).row();
  }
  keyboard.text(t.menuAdd, CB.add).text(t.home, CB.menu);
  return keyboard;
}

export function siteKeyboard(
  t: Dictionary,
  site: { id: string; url: string; paused: boolean },
): InlineKeyboard {
  return new InlineKeyboard()
    .text(t.checkNow, withId(CB.check, site.id))
    .text(site.paused ? t.resume : t.pause, withId(CB.pauseToggle, site.id))
    .row()
    .text(t.siteIncidents, withId(CB.siteIncidents, site.id))
    .text(t.delete, withId(CB.deleteAsk, site.id))
    .row()
    .url(t.openApp, appUrl(`/dashboard/monitors/${site.id}`))
    .row()
    .text(t.back, CB.sites)
    .text(t.home, CB.menu);
}

export function confirmDeleteKeyboard(t: Dictionary, siteId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(t.confirmDelete, withId(CB.deleteConfirm, siteId))
    .row()
    .text(t.cancel, withId(CB.site, siteId));
}

export function addKeyboard(t: Dictionary): InlineKeyboard {
  return new InlineKeyboard().text(t.cancel, CB.cancel);
}

export function incidentsKeyboard(t: Dictionary, siteId?: string): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  if (siteId) {
    keyboard.text(t.back, withId(CB.site, siteId));
  } else {
    keyboard.text(t.refresh, CB.incidents);
  }
  return keyboard.text(t.home, CB.menu);
}

export const PREFERENCE_KEYS: NotificationPreferenceKey[] = [
  'websiteDowntime',
  'websiteRecovery',
  'sslExpiration',
  'domainExpiration',
  'dnsChanges',
];

export function preferenceLabel(t: Dictionary, key: NotificationPreferenceKey): string {
  const labels: Record<NotificationPreferenceKey, string> = {
    websiteDowntime: t.prefWebsiteDowntime,
    websiteRecovery: t.prefWebsiteRecovery,
    sslExpiration: t.prefSslExpiration,
    domainExpiration: t.prefDomainExpiration,
    dnsChanges: t.prefDnsChanges,
  };
  return labels[key];
}

export function notificationsKeyboard(
  t: Dictionary,
  prefs: Record<NotificationPreferenceKey, boolean>,
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const key of PREFERENCE_KEYS) {
    const mark = prefs[key] ? '✅' : '☐';
    keyboard.text(`${mark} ${preferenceLabel(t, key)}`, withId(CB.notificationToggle, key)).row();
  }
  keyboard.text(t.sendTest, CB.notificationTest).row().text(t.home, CB.menu);
  return keyboard;
}

export function planKeyboard(
  t: Dictionary,
  options: {
    upgrades: Array<{ code: string; name: string; price: string }>;
    billingConfigured: boolean;
    hasCustomer: boolean;
  },
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  if (options.billingConfigured) {
    for (const plan of options.upgrades) {
      keyboard.text(t.upgradeTo(plan.name, plan.price), withId(CB.checkout, plan.code)).row();
    }
    if (options.hasCustomer) {
      keyboard.text(t.manageBilling, CB.portal).row();
    }
  } else {
    keyboard.url(t.openBilling, appUrl('/settings?tab=billing')).row();
  }
  return keyboard.text(t.home, CB.menu);
}

export function checkoutKeyboard(t: Dictionary, url: string): InlineKeyboard {
  return new InlineKeyboard().url(t.payNow, url).row().text(t.back, CB.plan);
}

export function accountKeyboard(t: Dictionary): InlineKeyboard {
  return new InlineKeyboard()
    .url(t.openApp, appUrl('/settings'))
    .row()
    .text(t.disconnect, CB.disconnectAsk)
    .row()
    .text(t.home, CB.menu);
}

export function confirmDisconnectKeyboard(t: Dictionary): InlineKeyboard {
  return new InlineKeyboard()
    .text(t.confirmDisconnect, CB.disconnectConfirm)
    .row()
    .text(t.cancel, CB.account);
}

export function languageKeyboard(t: Dictionary, current: 'en' | 'ru', linked: boolean): InlineKeyboard {
  const keyboard = new InlineKeyboard()
    .text(`${current === 'en' ? '● ' : ''}${t.languageEn}`, withId(CB.setLanguage, 'en'))
    .text(`${current === 'ru' ? '● ' : ''}${t.languageRu}`, withId(CB.setLanguage, 'ru'))
    .row();
  return linked ? keyboard.text(t.home, CB.menu) : keyboard;
}

export function alertKeyboard(t: Dictionary, monitorId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(t.alertOpenSite, withId(CB.site, monitorId))
    .url(t.openApp, appUrl(`/dashboard/monitors/${monitorId}`));
}
