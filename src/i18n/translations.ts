import type { SupportedLanguage } from '@/store/useLanguage';

export type TranslationKey =
  | 'today.friends'
  | 'today.addFriend'
  | 'today.streak'
  | 'today.points'
  | 'today.weather.title'
  | 'today.nextUp'
  | 'today.noNextBlock'
  | 'today.createPlan'
  | 'today.planSectionTitle'
  | 'today.planEmptyTitle'
  | 'today.planEmptyHint'
  | 'today.planStats'
  | 'today.planStatsEmpty'
  | 'today.openPlanner'
  | 'today.startFocus'
  | 'today.summary.noPlans'
  | 'today.summary.withPlans'
  | 'today.pointsBreakdown'
  | 'plan.aiButton'
  | 'plan.focusButton'
  | 'plan.pastPlansAlert'
  | 'plan.deleteAllConfirmTitle'
  | 'plan.deleteAllConfirmMessage'
  | 'plan.deleteAllConfirmYes'
  | 'plan.deleteAllConfirmNo'
  | 'plan.selectMonth'
  | 'plan.monthsLabel'
  | 'plan.summary.withPlans'
  | 'plan.summary.noPlans'
  | 'lightTheme'
  | 'darkTheme'
  | 'ninjaTheme'
  | 'settings.theme'
  | 'points.title'
  | 'points.totalPoints'
  | 'points.themes'
  | 'points.badges'
  | 'points.frames'
  | 'points.status.equipped'
  | 'points.status.owned'
  | 'points.status.locked'
  | 'points.status.price'
  | 'points.button.buy'
  | 'points.button.equip'
  | 'points.button.equipped'
  | 'premium.title'
  | 'premium.subtitle'
  | 'premium.heroTitle'
  | 'premium.heroDescription'
  | 'premium.feature.aiPlanning'
  | 'premium.feature.aiPlanningDesc'
  | 'premium.feature.focusMode'
  | 'premium.feature.focusModeDesc'
  | 'premium.feature.streaks'
  | 'premium.feature.streaksDesc'
  | 'premium.feature.weeklySummary'
  | 'premium.feature.weeklySummaryDesc'
  | 'premium.info'
  | 'premium.cta'
  | 'premium.footerNote'
  | 'settings.title'
  | 'settings.profile'
  | 'settings.language'
  | 'settings.languageDescription'
  | 'settings.account'
  | 'settings.deleteAccount'
  | 'settings.deleteAccountWarning'
  | 'settings.deleteAccountConfirm'
  | 'settings.deleteAccountCancel'
  | 'settings.deleteAccountSupport'
  | 'settings.notifications'
  | 'settings.vibration'
  | 'settings.vibrationDescription'
  | 'settings.notificationTypes'
  | 'settings.notificationCenter'
  | 'settings.notificationCount'
  | 'settings.notificationType.planReminders'
  | 'settings.notificationType.focusMode'
  | 'settings.notificationType.dailySummary'
  | 'settings.notificationType.streakWarning'
  | 'settings.waterReminder'
  | 'settings.waterReminderDescription'
  | 'settings.focus'
  | 'settings.pointsShop'
  | 'settings.signOut'
  | 'profile.title'
  | 'profile.name'
  | 'profile.email'
  | 'profile.changeEmail'
  | 'profile.changePassword'
  | 'profile.badges'
  | 'profile.totalPoints'
  | 'profile.streak'
  | 'profile.mostActiveCategory'
  | 'profile.totalFocusTime'
  | 'profile.saveName'
  | 'profile.stats'
  | 'profile.current'
  | 'profile.days'
  | 'focus.title'
  | 'focus.description'
  | 'focus.exit'
  | 'focus.addMinutes'
  | 'focus.minutesLabel'
  | 'focus.pointsPerMinute'
  | 'language.title'
  | 'language.current';

export type TranslationTable = Record<TranslationKey, string>;
type AllTranslations = Record<SupportedLanguage, TranslationTable>;

const english: TranslationTable = {
  'today.friends': 'Friends',
  'today.addFriend': 'Add',
  'today.streak': 'Streak',
  'today.points': 'Points',
  'today.weather.title': 'Weather',
  'today.nextUp': 'Next up',
  'today.noNextBlock': 'No upcoming blocks today.',
  'today.createPlan': 'Create a plan',
  'today.planSectionTitle': "Today’s plan",
  'today.planEmptyTitle': 'You haven’t planned today yet.',
  'today.planEmptyHint': 'Tap below to open the planner and create your first block.',
  'today.planStats': '{{total}} plan{{plural}} • {{hours}}h',
  'today.planStatsEmpty': 'No plans yet.',
  'today.openPlanner': 'Open planner',
  'today.startFocus': 'Start focus',
  'today.summary.noPlans': 'No plans yet - your day is wide open.',
  'today.summary.withPlans': '{{total}} plan{{plural}} • {{completed}} completed • {{hours}} hours',
  'today.pointsBreakdown': 'Today’s points: {{total}} (Plans {{plans}} • Focus {{focus}})',

  'plan.aiButton': 'AI Generate',
  'plan.focusButton': 'Focus',
  'plan.pastPlansAlert': 'Past plans cannot be edited.',
  'plan.deleteAllConfirmTitle': 'Delete all plans?',
  'plan.deleteAllConfirmMessage': 'Are you sure you want to delete all plans for this day?',
  'plan.deleteAllConfirmYes': 'Delete',
  'plan.deleteAllConfirmNo': 'Cancel',
  'plan.selectMonth': 'Select month',
  'plan.monthsLabel': 'Months',
  'plan.summary.withPlans': '{{total}} plan{{plural}} • {{hours}} hours total',
  'plan.summary.noPlans': 'No plan for this day yet. Use the grid below to add your first block.',
  'lightTheme': 'Light',
  'darkTheme': 'Dark',
  'ninjaTheme': 'Ninja',
  'settings.theme': 'Theme',

  'points.title': 'Points shop',
  'points.totalPoints': 'Total points',
  'points.themes': 'Themes',
  'points.badges': 'Badges',
  'points.frames': 'Frames',
  'points.status.equipped': 'Equipped',
  'points.status.owned': 'Owned',
  'points.status.locked': 'Locked',
  'points.status.price': '{{price}} pts',
  'points.button.buy': 'Buy',
  'points.button.equip': 'Equip',
  'points.button.equipped': 'Equipped',

  'premium.title': 'Organizer Premium',
  'premium.subtitle': 'Unlock smarter planning and deeper focus.',
  'premium.heroTitle': 'Smart daily planning',
  'premium.heroDescription': 'AI recommendations shape each block around your goals.',
  'premium.feature.aiPlanning': 'AI-powered planning',
  'premium.feature.aiPlanningDesc': 'Generate day-wide plans tailored to your schedule.',
  'premium.feature.focusMode': 'Advanced focus mode',
  'premium.feature.focusModeDesc': 'Level up streaks and rewards while you stay in flow.',
  'premium.feature.streaks': 'Streaks & badges',
  'premium.feature.streaksDesc': 'Track consistency and unlock exclusive badges.',
  'premium.feature.weeklySummary': 'Weekly summary',
  'premium.feature.weeklySummaryDesc': 'Review how your time was spent with visual reports.',
  'premium.info': 'Pause anytime; your AI plan stays ready when you return.',
  'premium.cta': 'Unlock Premium',
  'premium.footerNote': 'AI planning + focus mode integrations',

  'settings.title': 'Settings',
  'settings.profile': 'Profile & account',
  'settings.language': 'Language',
  'settings.languageDescription': 'Change the app language to keep the UI readable for you.',
  'settings.account': 'Account',
  'settings.deleteAccount': 'Delete account',
  'settings.deleteAccountWarning':
    'Deleting your account removes your plans, streaks, and points forever.',
  'settings.deleteAccountConfirm': 'Delete account',
  'settings.deleteAccountCancel': 'Cancel',
  'settings.deleteAccountSupport': 'Contact support to permanently delete your account.',
  'settings.notifications': 'Notifications',
  'settings.vibration': 'Vibration',
  'settings.vibrationDescription': 'Allow brief vibration whenever you receive an alert.',
  'settings.notificationTypes': 'Notification types',
  'settings.notificationCenter': 'All notifications',
  'settings.notificationCount': '{{count}} enabled',
  'settings.notificationType.planReminders': 'Plan reminders',
  'settings.notificationType.focusMode': 'Focus mode',
  'settings.notificationType.dailySummary': 'Daily summary',
  'settings.notificationType.streakWarning': 'Streak warning',
  'settings.waterReminder': 'Water reminder',
  'settings.waterReminderDescription': 'Gentle nudges to stay hydrated during the day.',
  'settings.focus': 'Focus mode',
  'settings.pointsShop': 'Points shop',
  'settings.signOut': 'Sign out',

  'profile.title': 'Profile',
  'profile.name': 'Full name',
  'profile.email': 'Email',
  'profile.changeEmail': 'Change email',
  'profile.changePassword': 'Change password',
  'profile.badges': 'Badges',
  'profile.totalPoints': 'Total points',
  'profile.streak': 'Streak',
  'profile.mostActiveCategory': 'Most active category',
  'profile.totalFocusTime': 'Total focus time',
  'profile.saveName': 'Save name',
  'profile.stats': 'Stats',
  'profile.current': 'Current',
  'profile.days': 'days',

  'focus.title': 'Focus mode engaged',
  'focus.description':
    "This app can’t block calls or system notifications. For full silence, also enable your phone’s Focus / Do Not Disturb mode.",
  'focus.exit': 'Exit mode',
  'focus.addMinutes': 'Add +15 minutes',
  'focus.minutesLabel': '{{minutes}} min left',
  'focus.pointsPerMinute': '+{{points}} points per minute',

  'language.title': 'Language',
  'language.current': 'Current language',
};

const turkish: TranslationTable = {
  'today.friends': 'Arkadaşlar',
  'today.addFriend': 'Ekle',
  'today.streak': 'Seri',
  'today.points': 'Puan',
  'today.weather.title': 'Hava durumu',
  'today.nextUp': 'Sıradaki',
  'today.noNextBlock': 'Bugün için yaklaşan blok yok.',
  'today.createPlan': 'Plan oluştur',
  'today.planSectionTitle': 'Bugünün planı',
  'today.planEmptyTitle': 'Bugün için henüz plan yapmadın.',
  'today.planEmptyHint': 'Planlayıcıyı açıp ilk bloğunu oluşturmak için aşağıya dokun.',
  'today.planStats': '{{total}} plan • {{hours}} saat',
  'today.planStatsEmpty': 'Henüz plan yok.',
  'today.openPlanner': 'Planlayıcıyı aç',
  'today.startFocus': 'Fokusa başla',
  'today.summary.noPlans': 'Bugün için plan yok - günün geniş ve sakin.',
  'today.summary.withPlans': '{{total}} plan • {{completed}} tamamlandı • {{hours}} saat',
  'today.pointsBreakdown': 'Bugünkü puanlar: {{total}} (Planlar {{plans}} • Fokus {{focus}})',

  'plan.aiButton': '✨ AI Plan',
  'plan.focusButton': 'Fokus',
  'plan.pastPlansAlert': 'Geçmiş planlar düzenlenemez.',
  'plan.deleteAllConfirmTitle': 'Tüm planlar silinsin mi?',
  'plan.deleteAllConfirmMessage': 'Bugüne ait tüm planları silmek istediğine emin misin?',
  'plan.deleteAllConfirmYes': 'Sil',
  'plan.deleteAllConfirmNo': 'Vazgeç',
  'plan.selectMonth': 'Ay seç',
  'plan.summary.withPlans': '{{total}} plan • {{hours}} saat toplam',
  'plan.summary.noPlans': 'Bugün için plan yok. Aşağıdaki ızgaradan ilk bloğunu ekle.',
  'lightTheme': 'Açık',
  'darkTheme': 'Koyu',
  'ninjaTheme': 'Ninja',
  'settings.theme': 'Tema',

  'points.title': 'Puan dükkanı',
  'points.totalPoints': 'Toplam puan',
  'points.themes': 'Temalar',
  'points.badges': 'Rozetler',
  'points.frames': 'Çerçeveler',
  'points.status.equipped': 'Takılı',
  'points.status.owned': 'Sahip',
  'points.status.locked': 'Kilitli',
  'points.status.price': '{{price}} puan',
  'points.button.buy': 'Satın al',
  'points.button.equip': 'Tak',
  'points.button.equipped': 'Takılı',

  'premium.title': 'Organizer Premium',
  'premium.subtitle': 'Daha akıllı planlama ve derin odak sunar.',
  'premium.heroTitle': 'Akıllı günlük planlama',
  'premium.heroDescription': 'Yapay zeka önerileri her bloğu hedeflerine göre şekillendirir.',
  'premium.feature.aiPlanning': 'AI destekli planlama',
  'premium.feature.aiPlanningDesc': 'Günlük planlarını yaşamına göre otomatik oluştur.',
  'premium.feature.focusMode': 'Gelişmiş fokus modu',
  'premium.feature.focusModeDesc': 'Seriler ve ödüllerle odaklanmanı güçlendir.',
  'premium.feature.streaks': 'Seri & rozetler',
  'premium.feature.streaksDesc': 'Tutarlılığı takip et ve özel rozetler kazan.',
  'premium.feature.weeklySummary': 'Haftalık özet',
  'premium.feature.weeklySummaryDesc': 'Zamanını görsel raporlarla izle.',
  'premium.info': 'Premium’u istediğin zaman durdur; AI planların hazır kalır.',
  'premium.cta': 'Premium’u aç',
  'premium.footerNote': 'AI planlama + fokus modu entegrasyonları',

  'settings.title': 'Ayarlar',
  'settings.profile': 'Profil & hesap',
  'settings.language': 'Dil',
  'settings.languageDescription': 'Uygulama dilini değiştirerek arayüzü kendine uygun hale getir.',
  'settings.account': 'Hesap',
  'settings.deleteAccount': 'Hesabı sil',
  'settings.deleteAccountWarning':
    'Hesabını silmek planlarını, serilerini ve puanlarını geri dönülemez şekilde kaldırır.',
  'settings.deleteAccountConfirm': 'Hesabı sil',
  'settings.deleteAccountCancel': 'Vazgeç',
  'settings.deleteAccountSupport': 'Hesabını kalıcı olarak silmek için destek ekibiyle iletişime geç.',
  'settings.notifications': 'Bildirimler',
  'settings.vibration': 'Titreşim',
  'settings.vibrationDescription': 'Bildirimler için kısa titreşimlere izin ver.',
  'settings.notificationTypes': 'Bildirim türleri',
  'settings.notificationCenter': 'Tüm bildirimler',
  'settings.notificationCount': '{{count}} etkin',
  'settings.notificationType.planReminders': 'Plan hatırlatmaları',
  'settings.notificationType.focusMode': 'Fokus modu',
  'settings.notificationType.dailySummary': 'Günlük özet',
  'settings.notificationType.streakWarning': 'Seri uyarısı',
  'settings.waterReminder': 'Su hatırlatıcısı',
  'settings.waterReminderDescription': 'Gün boyu su içmeni hatırlatan nazik uyarılar al.',
  'settings.focus': 'Fokus modu',
  'settings.pointsShop': 'Puan dükkanı',
  'settings.signOut': 'Çıkış yap',

  'profile.title': 'Profil',
  'profile.name': 'İsim',
  'profile.email': 'E-posta',
  'profile.changeEmail': 'E-posta değiştir',
  'profile.changePassword': 'Şifre değiştir',
  'profile.badges': 'Rozetler',
  'profile.totalPoints': 'Toplam puan',
  'profile.streak': 'Seri',
  'profile.mostActiveCategory': 'En aktif kategori',
  'profile.totalFocusTime': 'Toplam fokus süresi',
  'profile.saveName': 'İsmi kaydet',
  'profile.stats': 'İstatistikler',
  'profile.current': 'Mevcut',
  'profile.days': 'gün',

  'focus.title': 'Fokus modu etkin',
  'focus.description':
    'Bu uygulama aramaları veya sistem bildirimlerini engelleyemez. Tam sessizlik için telefonunun Fokus / Rahatsız etme modunu da aç.',
  'focus.exit': 'Moddan çık',
  'focus.addMinutes': '15 dakika ekle',
  'focus.minutesLabel': '{{minutes}} dk kaldı',
  'focus.pointsPerMinute': 'Dakika başına +{{points}} puan',

  'language.title': 'Dil',
  'language.current': 'Geçerli dil',
};

const cloneTable = (source: TranslationTable): TranslationTable =>
  Object.fromEntries(Object.entries(source)) as TranslationTable;

export const translations: AllTranslations = {
  en: english,
  tr: turkish,
  es: cloneTable(english),
  de: cloneTable(english),
  fr: cloneTable(english),
  it: cloneTable(english),
  pt: cloneTable(english),
  ru: cloneTable(english),
  ar: cloneTable(english),
  zh: cloneTable(english),
};
