(function() {
    const cookieName = 'myancode_privacy_consent';

    function setCookie(name, value, days = 365) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "; expires=" + date.toUTCString();
        const secure = location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax" + secure;
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for(let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    function deleteCookie(name) {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }

    if (getCookie(cookieName)) return;

    const dict = {
        en: {
            title: "Data Privacy & Cookie Policy",
            desc: "At MyanCode, we respectfully utilize strictly necessary cookies to ensure the core functionality and security of our platform. With your explicit permission, we also deploy analytical cookies to continuously refine your digital experience and deliver highly tailored enterprise solutions. We hold your data privacy in the highest regard.",
            ess: "Essential Only",
            acc: "Accept All",
            toastEss: "Strictly essential cookies have been saved.",
            toastAcc: "Thank you. All cookies have been accepted."
        },
        mm: {
            title: "အချက်အလက်လုံခြုံရေးနှင့် ကွတ်ကီးမူဝါဒ",
            desc: "MyanCode မှ လူကြီးမင်း၏ အသုံးပြုမှု အတွေ့အကြုံကို အကောင်းဆုံးဖြစ်စေရန်နှင့် စနစ်၏ အခြေခံလုပ်ဆောင်ချက်များ လုံခြုံချောမွေ့စေရန် မရှိမဖြစ်လိုအပ်သော ကွတ်ကီးများကို အသုံးပြုပါသည်။ ထို့အပြင် ဝန်ဆောင်မှုများကို ပိုမိုကောင်းမွန်စေရန် လူကြီးမင်း၏ ခွင့်ပြုချက်ဖြင့် အခြားသော ကွတ်ကီးများကိုလည်း စနစ်တကျ အသုံးပြုပါမည်။",
            ess: "အခြေခံလိုအပ်ချက်များသာ",
            acc: "အားလုံးကို လက်ခံမည်",
            toastEss: "အခြေခံ ကွတ်ကီးများကိုသာ မှတ်သားထားပါသည်။",
            toastAcc: "လူကြီးမင်း၏ ရွေးချယ်မှုအတွက် အထူးကျေးဇူးတင်ရှိပါသည်။"
        }
    };

    const getLang = () => document.documentElement.lang === 'mm' || localStorage.getItem('myancode_lang') === 'mm' ? 'mm' : 'en';

    function init() {
        if (document.getElementById('mc-cookie-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'mc-cookie-banner';
        banner.className = 'fixed bottom-0 left-0 w-full z-[9999] bg-[#050505]/95 backdrop-blur-3xl border-t border-white/10 px-6 py-6 md:px-12 md:py-8 transform translate-y-full opacity-0 pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] font-sans shadow-[0_-20px_50px_-10px_rgba(0,0,0,0.7)]';

        banner.innerHTML = `
            <div class="w-full max-w-[1536px] mx-auto flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8 xl:gap-16">
                <div class="flex flex-col md:flex-row gap-5 md:gap-8 items-start xl:items-center xl:max-w-[70%]">
                    <div class="flex items-center justify-center w-14 h-14 rounded-xl bg-white/5 border border-white/10 text-white shadow-inner shrink-0 hidden sm:flex">
                       <i data-lucide="cookie" class="w-7 h-7"></i>
                    </div>
                    <div class="flex flex-col gap-2.5">
                        <div class="flex items-center gap-3 sm:hidden mb-1">
                            <i data-lucide="cookie" class="w-6 h-6 text-white"></i>
                            <h3 id="mc-cb-title-mob" class="text-white font-display font-bold text-[14px] tracking-[0.1em] uppercase"></h3>
                        </div>
                        <h3 id="mc-cb-title" class="text-white font-display font-bold text-[13px] tracking-[0.2em] uppercase hidden sm:block"></h3>
                        <p id="mc-cb-desc" class="text-[14px] text-gray-400 font-medium leading-relaxed tracking-wide"></p>
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row items-center w-full xl:w-auto gap-4 shrink-0 mt-2 xl:mt-0">
                    <button id="mc-cb-ess" class="w-full sm:w-auto px-10 py-4 rounded-lg border border-white/20 text-gray-300 text-[13px] font-bold tracking-widest uppercase hover:bg-white/10 hover:border-white/40 hover:text-white transition-all duration-300 whitespace-nowrap"></button>
                    <button id="mc-cb-acc" class="w-full sm:w-auto px-10 py-4 rounded-lg bg-white text-black text-[13px] font-bold tracking-widest uppercase hover:bg-gray-200 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.15)] whitespace-nowrap"></button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);

        const updateText = () => {
            const l = getLang();
            document.getElementById('mc-cb-title').innerText = dict[l].title;
            document.getElementById('mc-cb-title-mob').innerText = dict[l].title;
            document.getElementById('mc-cb-desc').innerText = dict[l].desc;
            document.getElementById('mc-cb-ess').innerText = dict[l].ess;
            document.getElementById('mc-cb-acc').innerText = dict[l].acc;

            if (l === 'mm') {
                document.getElementById('mc-cb-title').style.fontFamily = '"Jost", "Noto Sans Myanmar", sans-serif';
                document.getElementById('mc-cb-title-mob').style.fontFamily = '"Jost", "Noto Sans Myanmar", sans-serif';
                document.getElementById('mc-cb-desc').style.fontFamily = '"Inter", "Noto Sans Myanmar", sans-serif';
            } else {
                document.getElementById('mc-cb-title').style.fontFamily = '';
                document.getElementById('mc-cb-title-mob').style.fontFamily = '';
                document.getElementById('mc-cb-desc').style.fontFamily = '';
            }
        };

        updateText();

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mut) => {
                if (mut.type === 'attributes' && mut.attributeName === 'lang') updateText();
            });
        });
        observer.observe(document.documentElement, { attributes: true });

        requestAnimationFrame(() => {
            setTimeout(() => {
                banner.classList.remove('translate-y-full', 'opacity-0', 'pointer-events-none');
                banner.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
            }, 800);
        });

        const handleConsent = (val) => {
            setCookie(cookieName, val, 365);
            
            banner.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
            banner.classList.add('translate-y-full', 'opacity-0', 'pointer-events-none');
            
            setTimeout(() => {
                observer.disconnect();
                banner.remove();
            }, 700);

            if (typeof window.showToast === 'function') {
                window.showToast(dict[getLang()][val === 'all' ? 'toastAcc' : 'toastEss']);
            }
            
            window.dispatchEvent(new CustomEvent('myancodeCookieConsentChanged', { detail: { consent: val } }));
        };

        document.getElementById('mc-cb-ess').addEventListener('click', () => handleConsent('essential'));
        document.getElementById('mc-cb-acc').addEventListener('click', () => handleConsent('all'));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();