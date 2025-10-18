// ========================================
// يقين - موقع القرآن الكريم والأذكار
// ========================================

// العناصر الأساسية للموقع
const elements = {
  surahSelect: document.getElementById('surahSelect'),
  mushafContent: document.getElementById('mushafContent'),
  mushafLoading: document.getElementById('mushafLoading'),
  surahTitle: document.getElementById('surahTitle'),
  surahMeta: document.getElementById('surahMeta'),
  surahText: document.getElementById('surahText'),
  tabs: document.querySelectorAll('.tab'),
  adhkarContainer: document.getElementById('adhkarList'),
  resetAdhkarBtn: document.getElementById('resetAdhkar'),
  yearEl: document.getElementById('year'),
  scrollToTopBtn: document.getElementById('scrollToTopBtn'),
  navToggle: document.getElementById('navToggle')
};

// إعداد السنة الحالية
if (elements.yearEl) elements.yearEl.textContent = new Date().getFullYear();

// ========================================
// إعدادات API
// ========================================
const API_CONFIG = {
  QURAN_API: 'https://api.alquran.cloud/v1'
};

// ========================================
// نظام التخزين المؤقت (Caching)
// ========================================
const cache = {
  surahs: null,
  verses: new Map(),
  adhkar: null // إضافة ذاكرة تخزين مؤقت للأذكار
};

// ========================================
// حالة التطبيق
// ========================================
let currentChapter = 1;
let currentVerses = [];

// ========================================
// دوال جلب البيانات
// ========================================

/**
 * جلب قائمة السور
 */
async function fetchSurahList() {
  if (cache.surahs) return cache.surahs;
  
  try {
    const response = await fetch(`${API_CONFIG.QURAN_API}/surah`);
    if (!response.ok) throw new Error('تعذر تحميل قائمة السور');
    
    const data = await response.json();
    cache.surahs = data.data.map(chapter => ({
      number: chapter.number,
      name: chapter.name,
      versesCount: chapter.numberOfAyahs,
      revelationPlace: chapter.revelationType === 'Meccan' ? 'makkah' : 'madinah'
    }));
    
    return cache.surahs;
  } catch (error) {
    console.error('خطأ في جلب قائمة السور:', error);
    throw error;
  }
}

/**
 * حذف البسملة من النص
 */
function removeBasmala(text) {
  // التعبير النمطي (Regex) للبسملة مع الأخذ في الاعتبار الاختلافات الشائعة وحرف BOM
  const basmalaRegex = /^\uFEFF?بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ\s*/;
  // هذا التعبير قد لا يغطي كل الأشكال، يمكن استخدام تعبير أكثر شمولية إذا لزم الأمر
  // أو العودة للطريقة السابقة إذا كانت أدق للحالات المطلوبة.
  // مثال أكثر شمولية:
  const comprehensiveBasmalaRegex = /(?:\uFEFF?بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ|بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ|بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ)\s*/g;
  return text.replace(comprehensiveBasmalaRegex, '').trim();
}

/**
 * جلب نص السورة
 */
async function fetchSurahText(chapterId) {
  if (cache.verses.has(chapterId)) {
    return cache.verses.get(chapterId);
  }
  
  try {
    const response = await fetch(`${API_CONFIG.QURAN_API}/surah/${chapterId}/ar.asad`);
    if (!response.ok) throw new Error('تعذر تحميل السورة');
    
    const data = await response.json();
    
    // تحويل البيانات وحذف البسملة من الآية الأولى
    const verses = data.data.ayahs.map((ayah, index) => {
      let text = ayah.text;
      
      // حذف البسملة من الآية الأولى فقط (ما عدا سورة التوبة) لأنها تأتي مع الآية الأولى
      if (index === 0 && Number(chapterId) !== 9) {
        text = removeBasmala(text);
      }
      
      return {
        text_uthmani: text,
        number: ayah.numberInSurah
      };
    });
    
    cache.verses.set(chapterId, verses);
    return verses;
  } catch (error) {
    console.error('خطأ في جلب السورة:', error);
    throw error;
  }
}

// ========================================
// دوال عرض البيانات
// ========================================

/**
 * عرض جميع آيات السورة
 */
function renderSurahVerses() {
  if (!currentVerses.length) return;
  
  // عرض الآيات بالترتيب الصحيح مع أرقامها
  const html = currentVerses.map((verse, index) => {
    const ayahNumber = verse.number || (index + 1);
    return `<span class="ayah-text">${verse.text_uthmani}</span><span class="ayah-num">${ayahNumber}</span>`;
  }).join(' ');
  
  elements.surahText.innerHTML = html;
  elements.surahText.hidden = false;
}

/**
 * عرض السورة
 */
async function renderSurah(surahNumber, options = { scroll: true }) {
  if (!elements.mushafContent) return;
  
  try {
    elements.mushafLoading.hidden = false;
    elements.surahText.innerHTML = '';
    elements.surahText.hidden = true;
    
    currentChapter = Number(surahNumber);
    
    // جلب البيانات بالتوازي
    const [surahs, verses] = await Promise.all([
      fetchSurahList(),
      fetchSurahText(surahNumber)
    ]);
    
    const surah = surahs.find(s => s.number === currentChapter);
    currentVerses = verses;
    
    // تحديث معلومات السورة
    if (surah) {
      elements.surahTitle.textContent = ` ${surah.name}`;
      elements.surahMeta.textContent = `${surah.versesCount} آية • ${surah.revelationPlace === 'makkah' ? 'مكية' : 'مدنية'}`;
    }
    
    // إظهار/إخفاء البسملة
    toggleBasmala(surahNumber);
    
    // عرض الآيات
    renderSurahVerses();

    // تمرير الشاشة إلى بداية قسم المصحف لتحسين تجربة المستخدم
    if (options.scroll && elements.mushafContent) {
      elements.mushafContent.scrollIntoView({ behavior: 'smooth', block: 'start' }); // يتم التمرير فقط إذا كان الخيار مفعلاً
    }
    
  } catch (error) {
    elements.surahTitle.textContent = 'حدث خطأ';
    elements.surahMeta.textContent = '';
    elements.surahText.textContent = 'تعذر تحميل السورة. يرجى التحقق من الاتصال بالإنترنت.';
    elements.surahText.hidden = false;
    console.error('خطأ في عرض السورة:', error);
  } finally {
    elements.mushafLoading.hidden = true;
  }
}

/**
 * إظهار/إخفاء البسملة
 */
function toggleBasmala(chapterNumber) {
  const chapter = Number(chapterNumber);
  const basmalaEl = document.getElementById('basmala');
  if (!basmalaEl) return;

  // إظهار البسملة لجميع السور ما عدا سورة التوبة (رقم 9)
  basmalaEl.hidden = (chapter === 9);
}

// ========================================
// دوال الأذكار
// ========================================

/**
 * جلب بيانات الأذكار من ملف JSON
 */
async function fetchAdhkar() {
  if (cache.adhkar) return cache.adhkar;

  try {
    const response = await fetch('adhkar.json');
    if (!response.ok) throw new Error('تعذر تحميل ملف الأذكار');
    const data = await response.json();
    cache.adhkar = data;
    return data;
  } catch (error) {
    console.error('خطأ في جلب الأذكار:', error);
    elements.adhkarContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted);">تعذر تحميل الأذكار. يرجى المحاولة مرة أخرى.</p>';
    return null;
  }
}

/**
 * عرض الأذكار
 */
async function renderAdhkar(kind = 'morning') {
  if (!elements.adhkarContainer) return;

  const adhkarData = await fetchAdhkar();
  if (!adhkarData) return;

  const list = kind === 'evening' ? adhkarData.evening : adhkarData.morning;
  const totalAdhkar = list.length;
  
  elements.adhkarContainer.innerHTML = `
    <div class="adhkar-progress">
      <div class="progress-info">
        <span class="progress-text">الأذكار المكتملة: <span id="completedCount">0</span> من ${totalAdhkar}</span>
        <div class="progress-bar">
          <div class="progress-fill" id="progressFill"></div>
        </div>
      </div>
    </div>
    ${list.map((dhikr, index) => `
      <div class="zekr">
        <div class="zekr-text">${dhikr.text}</div>
        <div class="counter">
          <span class="count" data-count>${dhikr.count}</span>
          <button class="dec" data-dec aria-label="تقليل العدد">ـ</button>
        </div>
        <div class="meta" title="${dhikr.virtue || 'فضل الذكر'}">${dhikr.count > 1 ? `التكرار: ${dhikr.count}` : 'مرة واحدة'}</div>
      </div>
    `).join('')}
  `;
  
  // تحديث مؤشر التقدم
  updateProgress();
}

/**
 * معالجة نقص عدد الذكر
 */
function handleDhikrDecrement(event) {
  // التأكد من أن العنصر الذي تم النقر عليه هو بطاقة الذكر نفسها أو زر النقصان
  const card = event.target.closest('.zekr');
  if (!card) return; // إذا لم يكن ضمن بطاقة الذكر، اخرج من الدالة

  const countSpan = card.querySelector('[data-count]');
  if (!card || !countSpan) return; // حماية إضافية
  const currentCount = Number(countSpan.textContent);
  
  // منع العد التنازلي بعد الوصول إلى صفر
  if (currentCount > 0) {
    countSpan.textContent = currentCount - 1;
    
    // تأثير بصري عند النقر
    countSpan.style.transform = 'scale(0.9)';
    setTimeout(() => {
      countSpan.style.transform = 'scale(1)';
    }, 150);
    
    // إذا وصل العد إلى صفر
    if (currentCount === 1) {
      markDhikrCompleted(card, countSpan);
    } else {
      // تحديث مؤشر التقدم فقط إذا لم يكن الذكر قد اكتمل بالفعل
      updateProgress();
    }
  }
}

/**
 * تعليم الذكر كمكتمل
 */
function markDhikrCompleted(card, countSpan) {
  countSpan.style.background = 'rgba(28, 150, 87, 0.35)';
  countSpan.style.borderColor = 'rgba(28, 150, 87, 0.6)';
  card.style.opacity = '0.7';
  card.classList.add('completed');

  // تحديث مؤشر التقدم بعد اكتمال الذكر
  updateProgress();
}

/**
 * تحديث مؤشر التقدم
 */
function updateProgress() {
  const completedCards = elements.adhkarContainer.querySelectorAll('.zekr.completed').length;
  const totalCards = elements.adhkarContainer.querySelectorAll('.zekr').length;
  const completedCount = document.getElementById('completedCount');
  const progressFill = document.getElementById('progressFill');
  
  if (completedCount) {
    completedCount.textContent = completedCards;
  }
  
  if (progressFill && totalCards > 0) {
    const percentage = (completedCards / totalCards) * 100;
    progressFill.style.width = `${percentage}%`;
    progressFill.style.transition = 'width 0.3s ease';
  }
}

// ========================================
// دوال التهيئة
// ========================================

/**
 * تحميل قائمة السور
 */
async function populateSurahs() {
  if (!elements.surahSelect) return;
  
  try {
    const surahs = await fetchSurahList();
    
    // إنشاء قائمة السور
    elements.surahSelect.innerHTML = surahs.map(s => 
      `<option value="${s.number}">${s.number}. ${s.name}</option>`
    ).join('');
    
    // تحميل السورة الأولى (الفاتحة)
    await renderSurah(1, { scroll: false });
    
  } catch (error) {
    elements.surahSelect.innerHTML = '<option>تعذر تحميل السور</option>';
    console.error('خطأ في تحميل قائمة السور:', error);
  }
}

/**
 * تهيئة الأذكار
 */
async function initializeAdhkar() {
  await renderAdhkar('morning');
}

// ========================================
// مستمعي الأحداث
// ========================================

// تغيير السورة
if (elements.surahSelect) {
  elements.surahSelect.addEventListener('change', e => {
    const surahNumber = e.target.value;
    if (surahNumber) {
      renderSurah(surahNumber);
    }
  });
}

// استخدام تفويض الأحداث لقائمة الأذكار
if (elements.adhkarContainer) {
  // يجب أن يستمع الحدث للنقرات داخل الحاوية بأكملها
  // والدالة الداخلية (handleDhikrDecrement) ستتحقق مما إذا كان الهدف هو الزر المطلوب
  elements.adhkarContainer.addEventListener('click', (event) => {
    handleDhikrDecrement(event);
  });
}

// تبويبات الأذكار
const adhkarTabs = document.querySelectorAll('.tabs .tab[data-tab]');
if (adhkarTabs.length > 0) {
  adhkarTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // إزالة الحالة النشطة من جميع التبويبات
      adhkarTabs.forEach(t => t.classList.remove('active'));
      
      // تفعيل التبويب المحدد
      tab.classList.add('active');
      
      // عرض الأذكار المناسبة
      const tabType = tab.dataset.tab;
      if (tabType) {
        renderAdhkar(tabType);
      }
    });
  });
}

// إعادة تعيين الأذكار
if (elements.resetAdhkarBtn) {
  elements.resetAdhkarBtn.addEventListener('click', () => {
    const activeTab = document.querySelector('.tabs .tab.active[data-tab]');
    const tabType = activeTab ? activeTab.dataset.tab : 'morning';
    renderAdhkar(tabType);
  });
}

// ========================================
// تهيئة الفيديو
// ========================================
const heroVideo = document.querySelector('.hero-video');
if (heroVideo) {
  heroVideo.src = 'assets/1.mp4';
  
  // تشغيل الفيديو تلقائياً مع معالجة الأخطاء
  heroVideo.play().catch(error => {
    console.log('تعذر تشغيل الفيديو تلقائياً:', error);
  });
  
  // إعادة تشغيل الفيديو عند الانتهاء
  heroVideo.addEventListener('ended', () => {
    heroVideo.currentTime = 0;
    heroVideo.play().catch(error => {
      console.log('تعذر إعادة تشغيل الفيديو:', error);
    });
  });
}

// ========================================
// زر الانتقال للأعلى
// ========================================

/**
 * دالة Throttle للحد من تكرار استدعاء دالة أخرى
 */
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

function handleScroll() {
  if (elements.scrollToTopBtn) {
    if (window.scrollY > 300) {
      elements.scrollToTopBtn.classList.add('show');
    } else {
      elements.scrollToTopBtn.classList.remove('show');
    }
  }
}

// إنشاء نسخة throttled من دالة handleScroll
const throttledScrollHandler = throttle(handleScroll, 100);


function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// ========================================
// قائمة التصفح المتنقلة
// ========================================
function toggleNav() {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks || !elements.navToggle) return;
  const isExpanded = elements.navToggle.getAttribute('aria-expanded') === 'true';
  
  elements.navToggle.setAttribute('aria-expanded', !isExpanded);
  navLinks.classList.toggle('active');
  document.body.classList.toggle('nav-open'); // لإضافة overlay أو منع التمرير
  
  if (!isExpanded) {
    elements.navToggle.setAttribute('aria-label', 'إغلاق القائمة');
  } else {
    elements.navToggle.setAttribute('aria-label', 'فتح القائمة');
  }
}

/**
 * إدارة التركيز داخل القائمة المفتوحة (Focus Trap)
 */
function handleNavFocus(e) {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks.classList.contains('active')) return;

  const focusableElements = navLinks.querySelectorAll('a[href]:not([disabled])');
  const firstFocusableElement = focusableElements[0];
  const lastFocusableElement = focusableElements[focusableElements.length - 1];

  const isTabPressed = e.key === 'Tab';

  if (!isTabPressed) {
    return;
  }

  if (e.shiftKey) { // Shift + Tab
    if (document.activeElement === firstFocusableElement) {
      lastFocusableElement.focus();
      e.preventDefault();
    }
  } else { // Tab
    if (document.activeElement === lastFocusableElement) {
      firstFocusableElement.focus();
      e.preventDefault();
    }
  }
}

// ========================================
// تهيئة التطبيق
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  
  // تهيئة القرآن
  populateSurahs();
  
  // تهيئة الأذكار
  initializeAdhkar();
  

  const navLinksContainer = document.querySelector('.nav-links');

  // إضافة مستمعي الأحداث العامة
  window.addEventListener('scroll', throttledScrollHandler, { passive: true });

  if (elements.scrollToTopBtn) {
    elements.scrollToTopBtn.addEventListener('click', scrollToTop);
  }
  if (elements.navToggle) {
    elements.navToggle.addEventListener('click', toggleNav);
  }
  // إغلاق القائمة عند النقر على رابط
  if (navLinksContainer) {
    navLinksContainer.addEventListener('click', (e) => {
      if (e.target.tagName === 'A' && navLinksContainer.classList.contains('active')) {
        toggleNav();
      }
    });
  }

  // إغلاق القائمة عند النقر خارجها
  document.addEventListener('click', (e) => {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks.classList.contains('active') && !navLinks.contains(e.target) && !elements.navToggle.contains(e.target)) {
      toggleNav();
    }
  });

  document.addEventListener('keydown', handleNavFocus);
});

// ========================================
// تنظيف التخزين المؤقت
// ========================================

/**
 * تنظيف ذاكرة التخزين المؤقت
 */
function clearCache() {
  if (cache.verses.size > 0) {
    cache.verses.clear();
  }
}

// تنظيف الذاكرة عند إغلاق الصفحة
window.addEventListener('beforeunload', clearCache);

// ========================================
// معالجة الأخطاء العامة
// ========================================

window.addEventListener('error', (event) => {
  console.error('حدث خطأ:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('وعد غير معالج:', event.reason);
});